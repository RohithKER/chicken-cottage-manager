import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppStore } from '../../store/StoreContext';
import { StaffMember, ShiftType } from '../../store/types';
import { APP_COLORS, STAFF_COLORS } from '../../constants/colors';
import { StaffBadge } from '../../components/StaffBadge';

type StaffFormData = {
  name: string;
  color: string;
  type: 'delivery' | 'inside' | 'both';
};

function StaffFormModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: StaffFormData | null;
  onSave: (data: StaffFormData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? STAFF_COLORS[0].value);
  const [type, setType] = useState<'delivery' | 'inside' | 'both'>(initial?.type ?? 'both');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setColor(initial?.color ?? STAFF_COLORS[0].value);
      setType(initial?.type ?? 'both');
    }
  }, [visible, initial]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a name for the staff member.');
      return;
    }
    onSave({ name: trimmed, color, type });
  };

  const TYPE_OPTIONS: { label: string; value: 'delivery' | 'inside' | 'both' }[] = [
    { label: '🛵 Delivery', value: 'delivery' },
    { label: '🏠 Inside', value: 'inside' },
    { label: '✨ Both', value: 'both' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetWrapper}>
        <View style={styles.formSheet}>
          <View style={styles.handle} />
          <Text style={styles.formTitle}>{initial ? 'Edit Staff' : 'Add Staff Member'}</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name..."
            placeholderTextColor={APP_COLORS.textSecondary}
            autoFocus={!initial}
          />

          <Text style={styles.label}>Role</Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.typeBtn, type === opt.value && styles.typeBtnActive]}
                onPress={() => setType(opt.value)}
              >
                <Text style={[styles.typeBtnText, type === opt.value && styles.typeBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Color</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
            {STAFF_COLORS.map(c => (
              <TouchableOpacity
                key={c.value}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c.value },
                  color === c.value && styles.colorSwatchSelected,
                ]}
                onPress={() => setColor(c.value)}
              />
            ))}
          </ScrollView>

          <Text style={styles.previewLabel}>Preview</Text>
          <StaffBadge name={name || 'Name'} color={color} />

          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>{initial ? 'Save Changes' : 'Add Staff'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function StaffItem({ member, onEdit, onDelete }: { member: StaffMember; onEdit: () => void; onDelete: () => void }) {
  return (
    <View style={styles.staffItem}>
      <View style={[styles.staffColorBar, { backgroundColor: member.color }]} />
      <View style={styles.staffInfo}>
        <Text style={styles.staffName}>{member.name}</Text>
        <Text style={styles.staffType}>
          {member.type === 'delivery' ? '🛵 Delivery' : member.type === 'inside' ? '🏠 Inside' : '✨ Both'}
        </Text>
      </View>
      <StaffBadge name={member.name} color={member.color} small />
      <TouchableOpacity style={styles.iconBtn} onPress={onEdit}>
        <Text style={styles.iconBtnText}>✎</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtnDanger} onPress={onDelete}>
        <Text style={styles.iconBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function StaffScreen() {
  const store = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [filterType, setFilterType] = useState<'all' | ShiftType>('all');

  const delivery = store.data.staff.filter(s => s.type === 'delivery' || s.type === 'both');
  const inside = store.data.staff.filter(s => s.type === 'inside' || s.type === 'both');
  const all = store.data.staff;
  const displayed = filterType === 'all' ? all : filterType === 'delivery' ? delivery : inside;

  const openAdd = () => { setEditMember(null); setShowForm(true); };
  const openEdit = (m: StaffMember) => { setEditMember(m); setShowForm(true); };

  const handleSave = async (data: StaffFormData) => {
    if (editMember) {
      await store.updateStaff({ ...editMember, ...data });
    } else {
      await store.addStaff(data);
    }
    setShowForm(false);
  };

  const handleDelete = (member: StaffMember) => {
    Alert.alert('Remove Staff', `Remove ${member.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => store.deleteStaff(member.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 Staff</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'delivery', 'inside'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filterType === f && styles.filterBtnActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[styles.filterBtnText, filterType === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'All' : f === 'delivery' ? '🛵 Delivery' : '🏠 Inside'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No staff members yet.</Text>
            <TouchableOpacity onPress={openAdd}>
              <Text style={styles.emptyLink}>Add one →</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <StaffItem
            member={item}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      <StaffFormModal
        visible={showForm}
        initial={editMember ? { name: editMember.name, color: editMember.color, type: editMember.type } : null}
        onSave={handleSave}
        onClose={() => setShowForm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  title: { color: APP_COLORS.text, fontSize: 20, fontWeight: '800' },
  addBtn: {
    backgroundColor: APP_COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: APP_COLORS.accent,
    borderColor: APP_COLORS.accent,
  },
  filterBtnText: { color: APP_COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  staffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  staffColorBar: { width: 5, alignSelf: 'stretch' },
  staffInfo: { flex: 1, paddingLeft: 12, paddingVertical: 12 },
  staffName: { color: APP_COLORS.text, fontWeight: '700', fontSize: 15 },
  staffType: { color: APP_COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  iconBtn: {
    padding: 12,
    marginLeft: 4,
  },
  iconBtnDanger: {
    padding: 12,
  },
  iconBtnText: { color: APP_COLORS.textSecondary, fontSize: 16 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: APP_COLORS.textSecondary, fontSize: 15 },
  emptyLink: { color: APP_COLORS.accent, fontSize: 15, marginTop: 8, fontWeight: '600' },
  // Form styles
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: APP_COLORS.modal,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#444466',
    alignSelf: 'center',
    marginBottom: 20,
  },
  formTitle: { color: APP_COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: APP_COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: APP_COLORS.surface,
    color: APP_COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  typeBtnActive: { backgroundColor: APP_COLORS.accent, borderColor: APP_COLORS.accent },
  typeBtnText: { color: APP_COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  typeBtnTextActive: { color: '#fff' },
  colorRow: { marginBottom: 4 },
  colorSwatch: {
    width: 34, height: 34, borderRadius: 17,
    marginRight: 8, marginVertical: 4,
  },
  colorSwatchSelected: {
    borderWidth: 3, borderColor: '#fff',
    transform: [{ scale: 1.15 }],
  },
  previewLabel: { color: APP_COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: APP_COLORS.surface, alignItems: 'center',
    borderWidth: 1, borderColor: APP_COLORS.border,
  },
  cancelText: { color: APP_COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: APP_COLORS.accent, alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
