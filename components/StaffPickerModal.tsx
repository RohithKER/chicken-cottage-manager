import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { StaffMember } from '../store/types';
import { APP_COLORS } from '../constants/colors';

interface StaffPickerModalProps {
  visible: boolean;
  staff: StaffMember[];
  selected: string[];
  dayLabel: string;
  columnLabel: string;
  onSave: (selected: string[]) => void;
  onClose: () => void;
}

export function StaffPickerModal({
  visible,
  staff,
  selected,
  dayLabel,
  columnLabel,
  onSave,
  onClose,
}: StaffPickerModalProps) {
  const [localSelected, setLocalSelected] = React.useState<string[]>(selected);

  React.useEffect(() => {
    if (visible) setLocalSelected(selected);
  }, [visible, selected]);

  const toggle = (id: string) => {
    setLocalSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {dayLabel} — {columnLabel}
          </Text>
          <Text style={styles.subtitle}>Tap to assign staff</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {staff.length === 0 ? (
              <Text style={styles.empty}>No staff found. Add staff in the Staff tab.</Text>
            ) : (
              staff.map(member => {
                const isSelected = localSelected.includes(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.item, isSelected && styles.itemSelected]}
                    onPress={() => toggle(member.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorDot, { backgroundColor: member.color }]} />
                    <Text style={styles.itemText}>{member.name}</Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearBtn} onPress={() => setLocalSelected([])}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(localSelected)}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: APP_COLORS.modal,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444466',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    color: APP_COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: APP_COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  list: {
    maxHeight: 300,
  },
  listContent: {
    paddingBottom: 10,
  },
  empty: {
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: APP_COLORS.surface,
  },
  itemSelected: {
    backgroundColor: '#2a2a42',
    borderWidth: 1,
    borderColor: APP_COLORS.accent,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  itemText: {
    color: APP_COLORS.text,
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  checkmark: {
    color: APP_COLORS.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  clearText: {
    color: APP_COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: APP_COLORS.accent,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
