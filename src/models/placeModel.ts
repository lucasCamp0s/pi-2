import { all, get, run, transaction } from '../config/database.js';
import type { CreatePlaceInput, PlaceFilters, MockUser, AccessibilityFeatureInput } from '../types/place.js';
import type { FeatureStatus } from '../config/accessibilityCatalog.js';

export interface PlaceRecord {
  id: number; name: string; category: string; description: string | null; address: string;
  latitude: number; longitude: number; contributorName: string; contributorEmail: string;
  createdAt: string; updatedAt: string;
  accessibilityFeatures: Array<{ type: string; status: FeatureStatus; notes: string | null }>;
}

type PlaceRow = {
  id: number; name: string; category: string; description: string | null; address: string;
  latitude: number; longitude: number; contributor_name: string; contributor_email: string;
  created_at: string; updated_at: string;
};

function toPlace(row: PlaceRow): PlaceRecord {
  const features = all<{ type: string; status: string; notes: string | null }>(
    'SELECT type, status, notes FROM accessibility_features WHERE place_id = ? ORDER BY id', [row.id]
  );
  return {
    id: row.id, name: row.name, category: row.category, description: row.description,
    address: row.address, latitude: row.latitude, longitude: row.longitude,
    contributorName: row.contributor_name, contributorEmail: row.contributor_email,
    createdAt: row.created_at, updatedAt: row.updated_at,
    accessibilityFeatures: features.map((feature) => ({ ...feature, status: feature.status as FeatureStatus }))
  };
}

function replaceFeatures(placeId: number, features: AccessibilityFeatureInput[] = []): void {
  run('DELETE FROM accessibility_features WHERE place_id = ?', [placeId]);
  for (const feature of features) {
    run('INSERT INTO accessibility_features (place_id, type, status, notes) VALUES (?, ?, ?, ?)',
      [placeId, feature.type, feature.status, feature.notes ?? null]);
  }
}

export const placeModel = {
  list(filters: PlaceFilters): PlaceRecord[] {
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (filters.q) {
      conditions.push('(p.name LIKE ? OR p.address LIKE ? OR p.description LIKE ?)');
      const query = `%${filters.q}%`; params.push(query, query, query);
    }
    if (filters.category) { conditions.push('p.category = ?'); params.push(filters.category); }
    if (filters.feature) {
      conditions.push('EXISTS (SELECT 1 FROM accessibility_features f WHERE f.place_id = p.id AND f.type = ?)');
      params.push(filters.feature);
      if (filters.status) {
        conditions.push('EXISTS (SELECT 1 FROM accessibility_features fs WHERE fs.place_id = p.id AND fs.type = ? AND fs.status = ?)');
        params.push(filters.feature, filters.status);
      }
    } else if (filters.status) {
      conditions.push('EXISTS (SELECT 1 FROM accessibility_features fs WHERE fs.place_id = p.id AND fs.status = ?)');
      params.push(filters.status);
    }
    const sql = `SELECT p.* FROM places p ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY p.name COLLATE NOCASE`;
    return all<PlaceRow>(sql, params).map(toPlace);
  },

  findById(id: number): PlaceRecord | undefined {
    const row = get<PlaceRow>('SELECT * FROM places WHERE id = ?', [id]);
    return row ? toPlace(row) : undefined;
  },

  create(input: CreatePlaceInput, user: MockUser): PlaceRecord {
    return transaction(() => {
      const result = run(`INSERT INTO places (name, category, description, address, latitude, longitude, contributor_name, contributor_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [input.name, input.category, input.description ?? null, input.address,
        input.latitude, input.longitude, user.nome, user.email]);
      replaceFeatures(result.lastInsertRowid, input.accessibilityFeatures);
      return this.findById(result.lastInsertRowid)!;
    });
  },

  update(id: number, input: CreatePlaceInput): PlaceRecord | undefined {
    return transaction(() => {
      const result = run(`UPDATE places SET name = ?, category = ?, description = ?, address = ?, latitude = ?, longitude = ?, updated_at = datetime('now') WHERE id = ?`,
        [input.name, input.category, input.description ?? null, input.address, input.latitude, input.longitude, id]);
      if (!result.changes) return undefined;
      replaceFeatures(id, input.accessibilityFeatures);
      return this.findById(id);
    });
  },

  delete(id: number): boolean {
    return transaction(() => run('DELETE FROM places WHERE id = ?', [id]).changes > 0);
  }
};



