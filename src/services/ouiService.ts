import fs from 'fs-extra';
import path from 'path';

export interface OuiEntry {
  oui: string;
  manufacturer: string;
  dateAdded: string;
  source: 'builtin' | 'lookup';
}

export class OuiService {
  private ouiDatabasePath: string;
  private ouiCache: Map<string, string> = new Map();

  constructor() {
    this.ouiDatabasePath = path.join(process.cwd(), 'data', 'oui-database.json');
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(path.dirname(this.ouiDatabasePath));
      
      // Load existing database if it exists
      if (await fs.pathExists(this.ouiDatabasePath)) {
        const data = await fs.readJson(this.ouiDatabasePath);
        if (data.entries) {
          data.entries.forEach((entry: OuiEntry) => {
            this.ouiCache.set(entry.oui, entry.manufacturer);
          });
        }
      } else {
        // Create initial database with built-in entries
        await this.createInitialDatabase();
      }
    } catch (error) {
      console.error('Failed to initialize OUI database:', error);
    }
  }

  private async createInitialDatabase() {
    // Built-in core OUI database (common manufacturers only to avoid duplicates)
    const builtinOuis: Record<string, string> = {
      // Apple devices (most common)
      '000393': 'Apple, Inc.',
      '000502': 'Apple, Inc.',
      '000A27': 'Apple, Inc.',
      '001451': 'Apple, Inc.',
      '0017F2': 'Apple, Inc.',
      '001B63': 'Apple, Inc.',
      '001E52': 'Apple, Inc.',
      '001EC2': 'Apple, Inc.',
      '001F5B': 'Apple, Inc.',
      '001FF3': 'Apple, Inc.',
      '24A43C': 'Apple, Inc.',
      '28CFE9': 'Apple, Inc.',
      '3C0754': 'Apple, Inc.',
      '40A3CC': 'Apple, Inc.',
      '44D884': 'Apple, Inc.',
      '4C8D79': 'Apple, Inc.',
      '50ED3C': 'Apple, Inc.',
      '60F81D': 'Apple, Inc.',
      '64200C': 'Apple, Inc.',
      '68967A': 'Apple, Inc.',
      '70CD60': 'Apple, Inc.',
      '78CA39': 'Apple, Inc.',
      '7C6D62': 'Apple, Inc.',
      '88C663': 'Apple, Inc.',
      '8CF710': 'Apple, Inc.',
      '9060F1': 'Apple, Inc.',
      '98FE94': 'Apple, Inc.',
      'A4C361': 'Apple, Inc.',
      'B8634D': 'Apple, Inc.',
      'BC52B7': 'Apple, Inc.',
      'CC25EF': 'Apple, Inc.',
      'E0B52D': 'Apple, Inc.',
      'F0B479': 'Apple, Inc.',
      'F40F24': 'Apple, Inc.',
      'F4F15A': 'Apple, Inc.',
      'F86214': 'Apple, Inc.',
      'FC253F': 'Apple, Inc.',
      
      // Samsung
      '000E35': 'Samsung Electronics',
      '0012FB': 'Samsung Electronics',
      '0015B9': 'Samsung Electronics',
      '001632': 'Samsung Electronics',
      '0016B8': 'Samsung Electronics',
      '001956': 'Samsung Electronics',
      '001C62': 'Samsung Electronics',
      '001E7D': 'Samsung Electronics',
      '0021D1': 'Samsung Electronics',
      '0026C6': 'Samsung Electronics',
      '002B05': 'Samsung Electronics',
      '2C0E3D': 'Samsung Electronics',
      '44F459': 'Samsung Electronics',
      '4C3C16': 'Samsung Electronics',
      '5C0A5B': 'Samsung Electronics',
      '68A86D': 'Samsung Electronics',
      '70F927': 'Samsung Electronics',
      '7C6193': 'Samsung Electronics',
      '8030DC': 'Samsung Electronics',
      '8C77F0': 'Samsung Electronics',
      'AC87A3': 'Samsung Electronics',
      'CC07AB': 'Samsung Electronics',
      'D0176A': 'Samsung Electronics',
      'E06267': 'Samsung Electronics',
      'F0728C': 'Samsung Electronics',
      
      // Google/Android
      '1C666D': 'Google, Inc.',
      '2C8A72': 'Google, Inc.',
      '50CC2E': 'Google, Inc.',
      '6466B3': 'Google, Inc.',
      '68C50C': 'Google, Inc.',
      '78E103': 'Google, Inc.',
      '7C2ECD': 'Google, Inc.',
      '80B2EC': 'Google, Inc.',
      '9C5CF9': 'Google, Inc.',
      'A0E4CB': 'Google, Inc.',
      'CC3A61': 'Google, Inc.',
      'DA7C02': 'Google, Inc.',
      'E4F04C': 'Google, Inc.',
      'F4F5DB': 'Google, Inc.',
      'F82C48': 'Google, Inc.',
      
      // Intel Corporation
      '00026F': 'Intel Corporation',
      '0002B3': 'Intel Corporation',
      '000347': 'Intel Corporation',
      '000423': 'Intel Corporation',
      '0007E9': 'Intel Corporation',
      '001302': 'Intel Corporation',
      '001517': 'Intel Corporation',
      '001731': 'Intel Corporation',
      '001B21': 'Intel Corporation',
      '001C23': 'Intel Corporation',
      '001E64': 'Intel Corporation',
      '00A0C9': 'Intel Corporation',
      '002618': 'Intel Corporation',
      '0026C7': 'Intel Corporation',
      '18E2C2': 'Intel Corporation',
      '1C3E84': 'Intel Corporation',
      '34E6D7': 'Intel Corporation',
      '3C970E': 'Intel Corporation',
      '8086F2': 'Intel Corporation',
      '8C16E5': 'Intel Corporation',
      'E4A7A0': 'Intel Corporation',
      
      // VMware
      '005056': 'VMware, Inc.',
      '000569': 'VMware, Inc.',
      '00155D': 'VMware, Inc.',
      '001C14': 'VMware, Inc.',
      
      // Router manufacturers
      '00056B': 'D-Link Corporation',
      '000FB5': 'NETGEAR',
      '0022B0': 'TP-Link Technologies',
      
      // Raspberry Pi
      'B827EB': 'Raspberry Pi Foundation',
      'DC63C2': 'Raspberry Pi Foundation',
      'E45F01': 'Raspberry Pi Foundation',
      
      // Other common
      '20C9D0': 'Amazon Technologies Inc.',
      '1C3971': 'Realtek Semiconductor',
      '000D56': 'Broadcom Corporation',
      '002147': 'Nintendo Co., Ltd.',
      '001125': 'Sony Corporation'
    };

    const entries: OuiEntry[] = Object.entries(builtinOuis).map(([oui, manufacturer]) => ({
      oui,
      manufacturer,
      dateAdded: new Date().toISOString(),
      source: 'builtin' as const
    }));

    const database = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      entries
    };

    await fs.writeJson(this.ouiDatabasePath, database, { spaces: 2 });
    
    // Load into cache
    entries.forEach(entry => {
      this.ouiCache.set(entry.oui, entry.manufacturer);
    });

    console.log(`Initialized OUI database with ${entries.length} built-in entries`);
  }

  async lookupManufacturer(oui: string): Promise<string | null> {
    const ouiUpper = oui.toUpperCase();
    return this.ouiCache.get(ouiUpper) || null;
  }

  async addOuiEntry(oui: string, manufacturer: string): Promise<void> {
    const ouiUpper = oui.toUpperCase();
    
    // Don't add if already exists
    if (this.ouiCache.has(ouiUpper)) {
      return;
    }

    try {
      // Add to memory cache
      this.ouiCache.set(ouiUpper, manufacturer);

      // Load current database
      let database: any = { version: '1.0', entries: [] };
      if (await fs.pathExists(this.ouiDatabasePath)) {
        database = await fs.readJson(this.ouiDatabasePath);
      }

      // Add new entry
      const newEntry: OuiEntry = {
        oui: ouiUpper,
        manufacturer,
        dateAdded: new Date().toISOString(),
        source: 'lookup'
      };

      database.entries.push(newEntry);
      database.lastUpdated = new Date().toISOString();

      // Save to file
      await fs.writeJson(this.ouiDatabasePath, database, { spaces: 2 });
      
      console.log(`Added new OUI to database: ${ouiUpper} -> ${manufacturer}`);
    } catch (error) {
      console.error('Failed to add OUI entry to database:', error);
    }
  }

  getStats(): { total: number, builtin: number, learned: number } {
    const total = this.ouiCache.size;
    const builtin = Math.min(total, 130); // Approximate builtin count
    const learned = Math.max(0, total - 130);
    
    return {
      total,
      builtin,
      learned
    };
  }
}
