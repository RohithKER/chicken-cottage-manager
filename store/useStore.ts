import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useRef } from 'react';
import { StaffMember, WeekSchedule, ShiftType, AppData, ShiftColumn } from './types';
import { DAYS } from '../constants/colors';

const STORAGE_KEY = '@ChickenCottage:data';

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function createEmptySchedule(type: ShiftType, weekStartDate: string, columns: ShiftColumn[]): WeekSchedule {
  const cells: WeekSchedule['cells'] = {};
  for (const day of DAYS) {
    cells[day] = {};
    for (const col of columns) {
      cells[day][col.id] = [];
    }
  }
  return {
    id: generateId(),
    type,
    weekStartDate,
    columns,
    cells,
  };
}

const DEFAULT_DELIVERY_COLUMNS: ShiftColumn[] = [
  { id: 'day', label: 'DAY' },
  { id: '4pm', label: '4:00' },
  { id: '5pm', label: '5:00' },
];

const DEFAULT_INSIDE_COLUMNS: ShiftColumn[] = [
  { id: 'day', label: 'DAY' },
  { id: 'morning', label: 'MORNING' },
  { id: 'night', label: 'Night' },
  { id: 'off', label: 'OFF' },
];

const DEFAULT_STAFF: StaffMember[] = [
  { id: 'shami', name: 'Shami', color: '#7c5cbf', type: 'delivery' },
  { id: 'abdul-d', name: 'Abdul', color: '#4a90d9', type: 'delivery' },
  { id: 'asim', name: 'Asim', color: '#3a9d6e', type: 'delivery' },
  { id: 'kado', name: 'Kado', color: '#4a90d9', type: 'inside' },
  { id: 'ercan', name: 'Ercan', color: '#2e7d9e', type: 'inside' },
  { id: 'rohith', name: 'Rohith', color: '#b8860b', type: 'inside' },
  { id: 'albert', name: 'Albert', color: '#5c6bc0', type: 'inside' },
  { id: 'anu', name: 'Anu', color: '#7c5cbf', type: 'inside' },
  { id: 'abzar', name: 'Abzar', color: '#3a9d6e', type: 'inside' },
  { id: 'aibal', name: 'Aibal', color: '#c0392b', type: 'inside' },
  { id: 'abuzar', name: 'Abuzar', color: '#5d9e61', type: 'inside' },
  { id: 'abdul-i', name: 'Abdul', color: '#d9844a', type: 'inside' },
];

function getDefaultData(): AppData {
  const monday = getMondayOfWeek(new Date());
  const weekStr = monday.toISOString();
  return {
    staff: DEFAULT_STAFF,
    deliverySchedules: [createEmptySchedule('delivery', weekStr, DEFAULT_DELIVERY_COLUMNS)],
    insideSchedules: [createEmptySchedule('inside', weekStr, DEFAULT_INSIDE_COLUMNS)],
  };
}

export function useStore() {
  const [data, setData] = useState<AppData>(getDefaultData);
  const [loading, setLoading] = useState(true);
  // Keep a ref to data for callbacks that need the latest value without re-creating
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        setData(parsed);
      }
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  const saveData = useCallback(async (newData: AppData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      setData(newData);
    } catch (e) {
      console.error('Failed to save data', e);
    }
  }, []);

  /**
   * Get an existing schedule for the given week, or create + immediately save a new one.
   * Using a ref + immediate save ensures the same schedule object is returned across renders.
   */
  const getOrCreateSchedule = useCallback((type: ShiftType, weekStartDate: string): WeekSchedule => {
    const current = dataRef.current;
    const schedules = type === 'delivery' ? current.deliverySchedules : current.insideSchedules;
    const existing = schedules.find(s => s.weekStartDate === weekStartDate);
    if (existing) return existing;

    // Create a new schedule using columns from the most recent existing schedule
    const lastSchedule = schedules[schedules.length - 1];
    const defaultColumns = type === 'delivery' ? DEFAULT_DELIVERY_COLUMNS : DEFAULT_INSIDE_COLUMNS;
    const columns = lastSchedule ? lastSchedule.columns : defaultColumns;
    const newSchedule = createEmptySchedule(type, weekStartDate, columns);

    // Save it immediately so future calls find it
    const key = type === 'delivery' ? 'deliverySchedules' : 'insideSchedules';
    const updatedData: AppData = {
      ...current,
      [key]: [...schedules, newSchedule],
    };
    // Save async in the background (don't await — we return synchronously)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData)).catch(console.error);
    setData(updatedData);

    return newSchedule;
  }, []);

  const saveSchedule = useCallback(async (schedule: WeekSchedule) => {
    const current = dataRef.current;
    const key = schedule.type === 'delivery' ? 'deliverySchedules' : 'insideSchedules';
    const schedules = [...(current[key] as WeekSchedule[])];
    const idx = schedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      schedules[idx] = schedule;
    } else {
      schedules.push(schedule);
    }
    await saveData({ ...current, [key]: schedules });
  }, [saveData]);

  const addStaff = useCallback(async (member: Omit<StaffMember, 'id'>) => {
    const newMember: StaffMember = { ...member, id: generateId() };
    const current = dataRef.current;
    await saveData({ ...current, staff: [...current.staff, newMember] });
  }, [saveData]);

  const updateStaff = useCallback(async (member: StaffMember) => {
    const current = dataRef.current;
    const staff = current.staff.map(s => s.id === member.id ? member : s);
    await saveData({ ...current, staff });
  }, [saveData]);

  const deleteStaff = useCallback(async (id: string) => {
    const current = dataRef.current;
    const staff = current.staff.filter(s => s.id !== id);
    await saveData({ ...current, staff });
  }, [saveData]);

  const exportData = useCallback((): string => {
    return JSON.stringify(dataRef.current, null, 2);
  }, []);

  const importData = useCallback(async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString) as AppData;
      // Basic validation
      if (!parsed.staff || !parsed.deliverySchedules || !parsed.insideSchedules) return false;
      await saveData(parsed);
      return true;
    } catch (e) {
      return false;
    }
  }, [saveData]);

  const getStaffForType = useCallback((type: ShiftType): StaffMember[] => {
    return dataRef.current.staff.filter(s => s.type === type || s.type === 'both');
  }, []);

  const getStaffById = useCallback((id: string): StaffMember | undefined => {
    return dataRef.current.staff.find(s => s.id === id);
  }, []);

  return {
    data,
    loading,
    getOrCreateSchedule,
    saveSchedule,
    addStaff,
    updateStaff,
    deleteStaff,
    exportData,
    importData,
    getStaffForType,
    getStaffById,
  };
}
