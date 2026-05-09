import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    fontSize: 13, fontWeight: '700', textTransform: 'uppercase',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8,
  },
  card: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    padding: 16, marginBottom: 4,
  },
  cardLabel: { fontSize: 15, fontWeight: '500', marginBottom: 12 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5,
    alignItems: 'center',
  },
  themeChipText: { fontSize: 14 },
  zoomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  resetText: { fontSize: 14, fontWeight: '500' },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoomBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  zoomBtnText: { fontSize: 24, fontWeight: '300', lineHeight: 28 },
  zoomLabel: { flex: 1, textAlign: 'center', fontSize: 14 },
  addBtn: {
    marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderWidth: 1,
    borderStyle: 'dashed', paddingVertical: 14, alignItems: 'center',
  },
  addBtnText: { fontSize: 15, fontWeight: '600' },
});
