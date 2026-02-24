# Staged Configuration System Proposal

## Overview
Implement a staged configuration system that uses temporary configuration files to allow safe editing, review, and rollback of changes before applying them to the live DNSmasq service.

## Why This Approach is Excellent

### **Benefits Over Complex Validation**
- ✅ **Simpler implementation** - no complex validation rules to maintain
- ✅ **Natural safety** - changes are isolated until explicitly applied
- ✅ **User-friendly workflow** - clear separation between editing and applying
- ✅ **Built-in rollback** - always have original configuration available
- ✅ **Visual diff capability** - users can see exactly what changed
- ✅ **Reduced risk** - impossible to accidentally break live configuration

### **Practical Advantages**
- ✅ **Experimenting safely** - users can try different configurations
- ✅ **Batch changes** - make multiple related changes before applying
- ✅ **Change review** - inspect all changes before committing
- ✅ **Training friendly** - perfect for learning without consequences
- ✅ **Collaborative editing** - multiple people can review changes

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Live Configuration                        │
│  /etc/dnsmasq.conf, /etc/dnsmasq.d/*.conf                         │
│  ↓ (copy on startup if staging doesn't exist)                      │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Staging Configuration                       │
│  ./config-staging/dnsmasq.conf, ./config-staging/*.conf           │
│  ↑ (all GUI edits happen here)                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Change Detection                           │
│  Compare staging vs live → Show "Changes Detected" banner          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
         ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
         │   Apply     │    │   Review    │    │   Revert    │
         │  Changes    │    │  Changes    │    │  Changes    │
         └─────────────┘    └─────────────┘    └─────────────┘
```

---

## Implementation Plan

### Phase 1: Staging Infrastructure

#### Directory Structure
```
dnsmasq-gui/
├── config-staging/           # Temporary configuration files
│   ├── dnsmasq.conf         # Main config
│   ├── static-leases.conf   # DHCP reservations
│   ├── dhcp-ranges.conf     # DHCP ranges
│   ├── dhcp-options.conf    # DHCP options
│   └── dns-records.conf     # DNS host records
├── config-live/             # Mirror of live config paths
│   └── paths.json           # Maps staging files to live paths
└── src/
    ├── services/
    │   ├── stagingService.ts     # Staging operations
    │   ├── changeDetector.ts     # Compare files
    │   └── configApplier.ts      # Apply changes to live
    └── routes/
        └── staging.ts            # API endpoints
```

#### Staging Service Implementation
```typescript
// src/services/stagingService.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export class StagingService {
    private stagingDir = path.join(__dirname, '../../config-staging');
    private liveConfigPaths = {
        main: '/etc/dnsmasq.conf',
        includes: '/etc/dnsmasq.d/'
    };

    async initializeStaging(): Promise<void> {
        // Create staging directory if it doesn't exist
        await fs.mkdir(this.stagingDir, { recursive: true });

        // Check if staging files exist
        const stagingExists = await this.stagingDirectoryExists();
        
        if (!stagingExists) {
            console.log('Staging directory empty, copying from live configuration...');
            await this.copyLiveToStaging();
        }

        // Always check for differences on startup
        const hasChanges = await this.detectChanges();
        if (hasChanges) {
            console.log('Detected differences between staging and live configuration');
        }
    }

    async copyLiveToStaging(): Promise<void> {
        try {
            // Copy main config file
            const liveMainConfig = await fs.readFile(this.liveConfigPaths.main, 'utf8');
            await fs.writeFile(
                path.join(this.stagingDir, 'dnsmasq.conf'), 
                liveMainConfig
            );

            // Copy include directory files
            const includeDir = this.liveConfigPaths.includes;
            const files = await fs.readdir(includeDir);
            
            for (const file of files) {
                if (file.endsWith('.conf')) {
                    const content = await fs.readFile(path.join(includeDir, file), 'utf8');
                    await fs.writeFile(path.join(this.stagingDir, file), content);
                }
            }

            console.log('Successfully copied live configuration to staging');
        } catch (error) {
            throw new Error(`Failed to copy live configuration: ${error.message}`);
        }
    }

    async copyStagingToLive(): Promise<void> {
        try {
            // Copy main config
            const stagingMainConfig = await fs.readFile(
                path.join(this.stagingDir, 'dnsmasq.conf'), 
                'utf8'
            );
            await fs.writeFile(this.liveConfigPaths.main, stagingMainConfig);

            // Copy staging files to includes directory
            const stagingFiles = await fs.readdir(this.stagingDir);
            
            for (const file of stagingFiles) {
                if (file.endsWith('.conf') && file !== 'dnsmasq.conf') {
                    const content = await fs.readFile(
                        path.join(this.stagingDir, file), 
                        'utf8'
                    );
                    await fs.writeFile(
                        path.join(this.liveConfigPaths.includes, file), 
                        content
                    );
                }
            }

            console.log('Successfully applied staging configuration to live');
        } catch (error) {
            throw new Error(`Failed to apply staging configuration: ${error.message}`);
        }
    }

    async revertStagingFromLive(): Promise<void> {
        await this.copyLiveToStaging();
        console.log('Reverted staging configuration from live');
    }

    private async stagingDirectoryExists(): Promise<boolean> {
        try {
            const files = await fs.readdir(this.stagingDir);
            return files.some(file => file.endsWith('.conf'));
        } catch {
            return false;
        }
    }
}
```

#### Change Detection Service
```typescript
// src/services/changeDetector.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

export interface FileComparison {
    file: string;
    status: 'added' | 'modified' | 'deleted' | 'unchanged';
    liveHash?: string;
    stagingHash?: string;
}

export interface ChangesSummary {
    hasChanges: boolean;
    files: FileComparison[];
    addedCount: number;
    modifiedCount: number;
    deletedCount: number;
}

export class ChangeDetector {
    private stagingDir = path.join(__dirname, '../../config-staging');
    private liveConfigPaths = {
        main: '/etc/dnsmasq.conf',
        includes: '/etc/dnsmasq.d/'
    };

    async detectChanges(): Promise<ChangesSummary> {
        const comparisons: FileComparison[] = [];
        
        // Get all staging files
        const stagingFiles = await this.getStagingFiles();
        
        // Get all live files
        const liveFiles = await this.getLiveFiles();
        
        // Compare each file
        const allFiles = new Set([...stagingFiles, ...liveFiles]);
        
        for (const file of allFiles) {
            const comparison = await this.compareFile(file);
            comparisons.push(comparison);
        }

        // Calculate summary
        const summary: ChangesSummary = {
            hasChanges: comparisons.some(c => c.status !== 'unchanged'),
            files: comparisons,
            addedCount: comparisons.filter(c => c.status === 'added').length,
            modifiedCount: comparisons.filter(c => c.status === 'modified').length,
            deletedCount: comparisons.filter(c => c.status === 'deleted').length
        };

        return summary;
    }

    async generateDiff(filename: string): Promise<string> {
        const livePath = this.getLiveFilePath(filename);
        const stagingPath = path.join(this.stagingDir, filename);

        try {
            const [liveContent, stagingContent] = await Promise.all([
                this.readFileOrEmpty(livePath),
                this.readFileOrEmpty(stagingPath)
            ]);

            // Simple diff implementation (in production, use a proper diff library)
            return this.generateSimpleDiff(liveContent, stagingContent, filename);
        } catch (error) {
            throw new Error(`Failed to generate diff for ${filename}: ${error.message}`);
        }
    }

    private async compareFile(filename: string): Promise<FileComparison> {
        const livePath = this.getLiveFilePath(filename);
        const stagingPath = path.join(this.stagingDir, filename);

        const [liveExists, stagingExists] = await Promise.all([
            this.fileExists(livePath),
            this.fileExists(stagingPath)
        ]);

        if (!liveExists && stagingExists) {
            return { file: filename, status: 'added' };
        }
        
        if (liveExists && !stagingExists) {
            return { file: filename, status: 'deleted' };
        }
        
        if (!liveExists && !stagingExists) {
            return { file: filename, status: 'unchanged' };
        }

        // Both exist, compare hashes
        const [liveHash, stagingHash] = await Promise.all([
            this.getFileHash(livePath),
            this.getFileHash(stagingPath)
        ]);

        return {
            file: filename,
            status: liveHash === stagingHash ? 'unchanged' : 'modified',
            liveHash,
            stagingHash
        };
    }

    private async getFileHash(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf8');
        return createHash('md5').update(content).digest('hex');
    }

    private getLiveFilePath(filename: string): string {
        if (filename === 'dnsmasq.conf') {
            return this.liveConfigPaths.main;
        }
        return path.join(this.liveConfigPaths.includes, filename);
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async readFileOrEmpty(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf8');
        } catch {
            return '';
        }
    }

    private generateSimpleDiff(oldContent: string, newContent: string, filename: string): string {
        // Simple line-by-line diff
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        
        let diff = `--- ${filename} (live)\n+++ ${filename} (staging)\n`;
        
        const maxLines = Math.max(oldLines.length, newLines.length);
        
        for (let i = 0; i < maxLines; i++) {
            const oldLine = oldLines[i] || '';
            const newLine = newLines[i] || '';
            
            if (oldLine !== newLine) {
                if (oldLine) diff += `-${oldLine}\n`;
                if (newLine) diff += `+${newLine}\n`;
            }
        }
        
        return diff;
    }
}
```

### Phase 2: Enhanced Banner System

#### New Banner Component
```html
<!-- Updated Changes Detected Banner -->
<div id="changes-banner" class="alert alert-info border-0 rounded-0 d-none position-sticky" style="top: 0; z-index: 1030;">
    <div class="container-fluid">
        <div class="row align-items-center">
            <div class="col-md-8">
                <div class="d-flex align-items-center">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>
                        <strong id="changes-message">Configuration changes detected</strong>
                        <div class="small text-muted" id="changes-summary">
                            <span id="changes-count">3 files modified</span> • 
                            <span id="changes-time">Last modified 2 minutes ago</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4 text-end">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-primary btn-sm" onclick="app.reviewChanges()">
                        <i class="bi bi-eye me-1"></i> Review Changes
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="app.revertChanges()">
                        <i class="bi bi-arrow-counterclockwise me-1"></i> Revert Changes
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="app.applyChanges()">
                        <i class="bi bi-check-circle me-1"></i> Apply Changes
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
```

#### JavaScript Banner Management
```javascript
class ChangesBanner {
    constructor() {
        this.banner = document.getElementById('changes-banner');
        this.message = document.getElementById('changes-message');
        this.summary = document.getElementById('changes-summary');
        this.count = document.getElementById('changes-count');
        this.time = document.getElementById('changes-time');
    }

    show(changesSummary) {
        if (!changesSummary.hasChanges) {
            this.hide();
            return;
        }

        // Update message based on change type
        if (changesSummary.addedCount > 0 || changesSummary.deletedCount > 0) {
            this.message.textContent = 'Configuration changes detected';
            this.banner.className = 'alert alert-warning border-0 rounded-0 position-sticky';
        } else {
            this.message.textContent = 'Configuration modifications detected';
            this.banner.className = 'alert alert-info border-0 rounded-0 position-sticky';
        }

        // Update summary
        const parts = [];
        if (changesSummary.modifiedCount > 0) {
            parts.push(`${changesSummary.modifiedCount} modified`);
        }
        if (changesSummary.addedCount > 0) {
            parts.push(`${changesSummary.addedCount} added`);
        }
        if (changesSummary.deletedCount > 0) {
            parts.push(`${changesSummary.deletedCount} deleted`);
        }

        this.count.textContent = parts.join(', ');
        this.time.textContent = `Last modified ${this.getTimeAgo()}`;

        this.banner.classList.remove('d-none');
    }

    hide() {
        this.banner.classList.add('d-none');
    }

    private getTimeAgo(): string {
        // Simple time ago implementation
        return 'just now';
    }
}
```

### Phase 3: Change Review Interface

#### Changes Review Modal
```html
<!-- Changes Review Modal -->
<div class="modal fade" id="changesReviewModal" tabindex="-1">
    <div class="modal-dialog modal-xl">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">
                    <i class="bi bi-eye me-2"></i>Review Configuration Changes
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <!-- Changes Summary -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card border-primary">
                            <div class="card-body text-center">
                                <h4 class="text-primary" id="review-modified-count">2</h4>
                                <p class="text-muted mb-0">Modified Files</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-success">
                            <div class="card-body text-center">
                                <h4 class="text-success" id="review-added-count">1</h4>
                                <p class="text-muted mb-0">Added Files</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card border-danger">
                            <div class="card-body text-center">
                                <h4 class="text-danger" id="review-deleted-count">0</h4>
                                <p class="text-muted mb-0">Deleted Files</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- File Tabs -->
                <ul class="nav nav-tabs" id="filesTabs" role="tablist">
                    <!-- Dynamically populated with changed files -->
                </ul>

                <!-- File Diff Content -->
                <div class="tab-content mt-3" id="filesTabsContent">
                    <!-- Dynamically populated with diff views -->
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    Close
                </button>
                <button type="button" class="btn btn-outline-warning" onclick="app.revertChanges()">
                    <i class="bi bi-arrow-counterclockwise me-1"></i> Revert All Changes
                </button>
                <button type="button" class="btn btn-primary" onclick="app.applyChanges()">
                    <i class="bi bi-check-circle me-1"></i> Apply All Changes
                </button>
            </div>
        </div>
    </div>
</div>
```

### Phase 4: Apply Changes Workflow

#### Configuration Applier Service
```typescript
// src/services/configApplier.ts
export class ConfigApplier {
    private stagingService: StagingService;
    private dnsmasqService: DnsmasqService;

    async applyChanges(): Promise<ApplyResult> {
        const result: ApplyResult = {
            success: false,
            requiresRestart: false,
            appliedFiles: [],
            errors: []
        };

        try {
            // 1. Detect what changed
            const changes = await this.changeDetector.detectChanges();
            
            // 2. Determine if restart is required
            result.requiresRestart = this.requiresRestart(changes);
            
            // 3. Backup current live configuration
            const backupPath = await this.createBackup();
            
            // 4. Apply staging to live
            await this.stagingService.copyStagingToLive();
            result.appliedFiles = changes.files
                .filter(f => f.status !== 'unchanged')
                .map(f => f.file);
            
            // 5. Reload or restart DNSmasq service
            if (result.requiresRestart) {
                await this.dnsmasqService.restart();
            } else {
                await this.dnsmasqService.reload();
            }
            
            result.success = true;

        } catch (error) {
            result.errors.push(`Failed to apply changes: ${error.message}`);
            
            // Attempt to restore from backup
            try {
                await this.restoreFromBackup(backupPath);
                await this.dnsmasqService.reload();
                result.errors.push('Configuration restored from backup');
            } catch (restoreError) {
                result.errors.push(`Failed to restore backup: ${restoreError.message}`);
            }
        }

        return result;
    }

    private requiresRestart(changes: ChangesSummary): boolean {
        // Changes that require restart vs reload
        const restartRequiredFiles = [
            'dnsmasq.conf'  // Main config changes often require restart
        ];

        const restartRequiredContent = [
            'interface=',
            'bind-interfaces',
            'port='
        ];

        return changes.files.some(file => {
            if (restartRequiredFiles.includes(file.file)) {
                return true;
            }
            
            // Check content for restart-required settings
            // (implementation would check actual file content)
            return false;
        });
    }
}
```

---

## User Experience Workflow

### Typical User Journey
```
1. User opens DNSmasq GUI
   ↓
2. System initializes staging (copies live config if needed)
   ↓
3. System detects differences → Shows "Changes Detected" banner
   ↓
4. User makes configuration changes (all saved to staging)
   ↓
5. User clicks "Review Changes" → See diff of all modifications
   ↓
6. User clicks "Apply Changes" → Warning if restart required
   ↓
7. System applies staging to live → Reloads/restarts DNSmasq
   ↓
8. Banner disappears → System ready for next changes
```

### Error Recovery
```
If Apply Changes fails:
1. Automatic rollback to previous live configuration
2. Staging remains unchanged (user can try again)
3. Clear error message explaining what went wrong
4. Option to retry or revert staging to live
```

---

## API Endpoints

```typescript
// Staging management endpoints
GET    /api/staging/status           // Get changes summary
GET    /api/staging/changes          // Get detailed file comparisons  
GET    /api/staging/diff/:filename   // Get diff for specific file
POST   /api/staging/apply            // Apply staging to live
POST   /api/staging/revert           // Revert staging from live
POST   /api/staging/reset            // Reset staging to live
```

---

## Benefits Summary

### **Safety & Reliability**
- ✅ **Zero risk editing** - live config never touched during editing
- ✅ **Always recoverable** - can always revert to working configuration
- ✅ **Batch operations** - apply multiple related changes atomically
- ✅ **Automatic backup** - system creates backups before applying

### **User Experience**
- ✅ **Clear visual feedback** - always know when changes are pending
- ✅ **Review before apply** - see exactly what will change
- ✅ **Flexible workflow** - work at your own pace
- ✅ **Mistake recovery** - easy to undo changes

### **Operational Benefits**
- ✅ **Reduced downtime** - fewer broken configurations
- ✅ **Better change management** - track what changed when
- ✅ **Training friendly** - safe environment for learning
- ✅ **Team collaboration** - multiple people can review changes

This staged configuration system strikes the perfect balance between safety and usability, providing professional-grade configuration management without overwhelming complexity. It's much more practical than complex validation while still preventing the vast majority of configuration errors.

---

*Proposal created: July 24, 2025*
