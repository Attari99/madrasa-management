import { supabase, isSupabaseConfigured } from './supabase';
import { storage } from '../utils/storage';

const COLLECTIONS = [
  'ustads', 'students', 'classes', 'student_attendance', 
  'ustad_attendance', 'monthly_progress', 'notifications', 
  'activity_logs', 'users', 'madrasa_settings'
];

export async function pullAll(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    let anyData = false;
    for (const collection of COLLECTIONS) {
      const { data, error } = await supabase
        .from('madrasa_data')
        .select('*')
        .eq('collection', collection);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        anyData = true;
        const localData = storage.get<any[]>(collection) ?? [];
        const existingIds = new Set(localData.map((d: any) => d.id));
        
        for (const item of data) {
          if (!existingIds.has(item.record_id)) {
            localData.push(item.data);
          } else {
            const index = localData.findIndex((d: any) => d.id === item.record_id);
            if (index !== -1) localData[index] = item.data;
          }
        }
        storage.set(collection, localData);
      }
    }
    return anyData;
  } catch (error) {
    console.error('Error pulling from Supabase:', error);
    return false;
  }
}

export async function pushAll(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    for (const collection of COLLECTIONS) {
      const localData = storage.get<any[]>(collection);
      
      // Check if localData exists and is an array
      if (localData && Array.isArray(localData) && localData.length > 0) {
        for (const record of localData) {
          if (record && record.id) {
            await pushRecord(collection, record.id, record);
          }
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error pushing to Supabase:', error);
    return false;
  }
}

export async function pushRecord(collection: string, id: string, data: any): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('madrasa_data')
      .upsert({ 
        collection, 
        record_id: id, 
        data, 
        updated_at: new Date().toISOString() 
      }, { 
        onConflict: 'collection,record_id' 
      });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error pushing ${collection}/${id}:`, error);
    return false;
  }
}

export async function deleteRecord(collection: string, id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('madrasa_data')
      .delete()
      .eq('collection', collection)
      .eq('record_id', id);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting ${collection}/${id}:`, error);
    return false;
  }
}

export async function deleteRecordsByDateField(collection: string, date: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('madrasa_data')
      .delete()
      .eq('collection', collection)
      .filter('data->>date', 'eq', date);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting ${collection} records for date ${date}:`, error);
    return false;
  }
}