import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { WeekSchedule, StaffMember, ShiftColumn } from '../store/types';
import { APP_COLORS, DAYS } from '../constants/colors';
import { StaffBadge } from './StaffBadge';
import { StaffPickerModal } from './StaffPickerModal';
import { AddColumnModal } from './AddColumnModal';

interface ShiftGridProps {
  schedule: WeekSchedule;
  staff: StaffMember[];
  onScheduleChange: (schedule: WeekSchedule) => void;
  getStaffById: (id: string) => StaffMember | undefined;
}

interface PickerState {
  day: string;
  columnId: string;
  columnLabel: string;
  selected: string[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatWeekRange(isoDate: string): string {
  try {
    const start = new Date(isoDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', { ...opts, year: 'numeric' })}`;
  } catch {
    return '';
  }
}

export function ShiftGrid({ schedule, staff, onScheduleChange, getStaffById }: ShiftGridProps) {
  const gridRef = useRef<View>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [exporting, setExporting] = useState(false);

  const openPicker = (day: string, col: ShiftColumn) => {
    setPicker({
      day,
      columnId: col.id,
      columnLabel: col.label,
      selected: schedule.cells[day]?.[col.id] ?? [],
    });
  };

  const savePicker = (selected: string[]) => {
    if (!picker) return;
    const newSchedule = {
      ...schedule,
      cells: {
        ...schedule.cells,
        [picker.day]: {
          ...schedule.cells[picker.day],
          [picker.columnId]: selected,
        },
      },
    };
    onScheduleChange(newSchedule);
    setPicker(null);
  };

  const addColumn = (label: string) => {
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newCol: ShiftColumn = { id, label };
    const newColumns = [...schedule.columns, newCol];
    const newCells = { ...schedule.cells };
    for (const day of DAYS) {
      newCells[day] = { ...(newCells[day] || {}), [id]: [] };
    }
    onScheduleChange({ ...schedule, columns: newColumns, cells: newCells });
  };

  const removeColumn = (colId: string) => {
    if (schedule.columns.length <= 1) {
      Alert.alert('Cannot remove', 'You must have at least one column.');
      return;
    }
    Alert.alert('Remove Column', 'Are you sure you want to remove this column?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const newColumns = schedule.columns.filter(c => c.id !== colId);
          const newCells = { ...schedule.cells };
          for (const day of DAYS) {
            const dayCells = { ...(newCells[day] || {}) };
            delete dayCells[colId];
            newCells[day] = dayCells;
          }
          onScheduleChange({ ...schedule, columns: newColumns, cells: newCells });
        },
      },
    ]);
  };

  const exportImage = async () => {
    if (!gridRef.current) return;
    setExporting(true);
    try {
      const uri = await captureRef(gridRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Shift Schedule',
        });
      } else {
        Alert.alert('Sharing not available on this device');
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  };

  const colWidth = Math.max(90, (SCREEN_WIDTH - 80) / schedule.columns.length);

  return (
    <View style={styles.container}>
      {/* Week header / controls */}
      <View style={styles.weekHeader}>
        <Text style={styles.weekLabel}>
          📅 {formatWeekRange(schedule.weekStartDate)}
        </Text>
        <TouchableOpacity style={styles.exportBtn} onPress={exportImage} disabled={exporting}>
          <Text style={styles.exportBtnText}>{exporting ? '⏳' : '📤 Share'}</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View ref={gridRef} collapsable={false} style={styles.captureArea}>
          {/* Column headers row */}
          <View style={styles.headerRow}>
            <View style={styles.dayLabelCell}>
              <Text style={styles.headerText} />
            </View>
            {schedule.columns.map(col => (
              <TouchableOpacity
                key={col.id}
                style={[styles.headerCell, { width: colWidth }]}
                onLongPress={() => removeColumn(col.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.headerText}>{col.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day rows */}
          {DAYS.map((day, dayIdx) => (
            <View key={day} style={[styles.row, dayIdx % 2 === 1 && styles.rowAlt]}>
              <View style={styles.dayLabelCell}>
                <Text style={styles.dayText}>{day.substring(0, 3).toUpperCase()}</Text>
              </View>
              {schedule.columns.map(col => {
                const staffIds = schedule.cells[day]?.[col.id] ?? [];
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.cell, { width: colWidth }]}
                    onPress={() => openPicker(day, col)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.badgeContainer}>
                      {staffIds.map(sid => {
                        const member = getStaffById(sid);
                        if (!member) return null;
                        return (
                          <StaffBadge
                            key={sid}
                            name={member.name}
                            color={member.color}
                          />
                        );
                      })}
                      {staffIds.length === 0 && (
                        <Text style={styles.emptyCell}>＋</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom controls */}
      <TouchableOpacity style={styles.addColBtn} onPress={() => setShowAddColumn(true)}>
        <Text style={styles.addColText}>+ Add Column</Text>
      </TouchableOpacity>
      <Text style={styles.hint}>Tap a cell to assign staff • Long-press column to remove</Text>

      {/* Staff picker modal */}
      {picker && (
        <StaffPickerModal
          visible={!!picker}
          staff={staff}
          selected={picker.selected}
          dayLabel={picker.day}
          columnLabel={picker.columnLabel}
          onSave={savePicker}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Add column modal */}
      <AddColumnModal
        visible={showAddColumn}
        onAdd={addColumn}
        onClose={() => setShowAddColumn(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  weekLabel: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  exportBtn: {
    backgroundColor: APP_COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  captureArea: {
    backgroundColor: APP_COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  dayLabelCell: {
    width: 52,
    paddingVertical: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
  },
  headerCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
  },
  headerText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    minHeight: 64,
  },
  rowAlt: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  dayText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  cell: {
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: APP_COLORS.border,
    minHeight: 64,
    justifyContent: 'flex-start',
  },
  badgeContainer: {
    flexDirection: 'column',
  },
  emptyCell: {
    color: APP_COLORS.border,
    fontSize: 16,
    textAlign: 'center',
    paddingTop: 12,
  },
  addColBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    borderStyle: 'dashed',
  },
  addColText: {
    color: APP_COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    color: APP_COLORS.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
    opacity: 0.6,
  },
});
