export interface StaffMember {
  id: string;
  name: string;
  color: string;
  type: 'delivery' | 'inside' | 'both';
}

export interface ShiftColumn {
  id: string;
  label: string;
}

export type ShiftType = 'delivery' | 'inside';

export interface WeekSchedule {
  id: string;
  type: ShiftType;
  weekStartDate: string; // ISO date string (Monday of that week)
  columns: ShiftColumn[];
  cells: {
    [day: string]: {
      [columnId: string]: string[]; // array of staff member IDs
    };
  };
}

export interface AppData {
  staff: StaffMember[];
  deliverySchedules: WeekSchedule[];
  insideSchedules: WeekSchedule[];
}
