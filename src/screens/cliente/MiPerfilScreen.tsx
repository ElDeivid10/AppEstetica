import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { PageHeader, SectionTitle, pageStyles as p } from '@/components/SalonUI';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;
export default function MiPerfilScreen() {
  const { logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('Ana López');
  const [phone, setPhone] = useState('55 1234 5678');
  const [allergies, setAllergies] = useState('Ninguna registrada');
  const save = () => { setEditing(false); setSaved(true); };

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader eyebrow="Tu cuenta" title="Mi perfil" subtitle="Tus datos y preferencias para una atención personalizada." />
      <View style={[p.card, styles.profileCard]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.trim().split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.profileName}>{name}</Text><Text style={p.muted}>Clienta desde octubre 2025</Text></View>
        <TouchableOpacity style={p.outlineButton} onPress={() => { setEditing(!editing); setSaved(false); }}><Text style={p.outlineButtonText}>{editing ? 'Cancelar' : 'Editar perfil'}</Text></TouchableOpacity>
      </View>

      {editing ? <View style={[p.card, styles.form]}>
        <Text style={styles.formTitle}>Datos personales</Text>
        <Text style={styles.fieldLabel}>NOMBRE COMPLETO</Text><TextInput value={name} onChangeText={setName} placeholder="Tu nombre" style={p.input} />
        <Text style={styles.fieldLabel}>TELÉFONO</Text><TextInput value={phone} onChangeText={setPhone} placeholder="Tu número de teléfono" keyboardType="phone-pad" style={p.input} />
        <Text style={styles.fieldLabel}>ALERGIAS O SENSIBILIDADES</Text><TextInput value={allergies} onChangeText={setAllergies} placeholder="Indica alergias o sensibilidades" multiline style={[p.input, { minHeight: 76, textAlignVertical: 'top' }]} />
        <TouchableOpacity style={p.button} onPress={save}><Text style={p.buttonText}>Guardar cambios</Text></TouchableOpacity>
      </View> : <View style={[p.card, styles.details]}>
        <SectionTitle title="Información personal" />
        <Detail label="NOMBRE" value={name} /><Detail label="TELÉFONO" value={phone} /><Detail label="ALERGIAS" value={allergies} />
        <View style={styles.preference}><Text style={styles.prefIcon}>✦</Text><View style={{ flex: 1 }}><Text style={styles.prefTitle}>Perfil capilar</Text><Text style={p.muted}>Cabello teñido · ondulado · cuidado de color</Text></View></View>
        {saved && <Text style={styles.saved}>Cambios guardados en esta demostración ✓</Text>}
      </View>}

      <View style={[styles.rewardCard]}>
        <View style={styles.rewardIcon}><Text style={{ fontSize: 22 }}>✧</Text></View><View style={{ flex: 1 }}><Text style={styles.rewardEyebrow}>YOSS BEAUTY CLUB</Text><Text style={styles.rewardTitle}>Recompensas</Text><Text style={styles.rewardText}>Estamos preparando beneficios para ti.</Text></View><View style={styles.comingSoon}><Text style={styles.comingSoonText}>PRÓXIMAMENTE</Text></View>
      </View>
      <TouchableOpacity style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Cerrar sesión</Text><Text style={styles.logoutArrow}>↗</Text></TouchableOpacity>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.fieldLabel}>{label}</Text><Text style={styles.detailValue}>{value || '—'}</Text></View>;
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary[700], fontSize: 16, fontWeight: '700' }, profileName: { color: colors.ink[800], fontSize: 15, fontWeight: '700', marginBottom: 3 },
  form: { gap: 9 }, formTitle: { color: colors.ink[800], fontSize: 17, fontWeight: '700', marginBottom: 3 }, fieldLabel: { color: colors.beige[500], fontSize: 9, letterSpacing: 1, fontWeight: '700', marginTop: 5 },
  details: { gap: 9 }, detailRow: { borderBottomWidth: 1, borderBottomColor: colors.beige[100], paddingVertical: 7 }, detailValue: { color: colors.ink[800], fontSize: 13, fontWeight: '600', marginTop: 4 },
  preference: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 13, backgroundColor: colors.beige[100], marginTop: 4 }, prefIcon: { color: colors.primary[500], fontSize: 22 }, prefTitle: { color: colors.ink[800], fontSize: 12, fontWeight: '700', marginBottom: 3 }, saved: { color: colors.primary[600], fontSize: 11, fontWeight: '700' },
  rewardCard: { borderRadius: 18, backgroundColor: colors.ink[800], padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, rewardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' }, rewardEyebrow: { fontSize: 8, color: colors.primary[200], letterSpacing: 1.4, fontWeight: '700' }, rewardTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginTop: 2 }, rewardText: { color: '#D2D2C8', fontSize: 10, marginTop: 3 }, comingSoon: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#FFFFFF1A', borderRadius: 9 }, comingSoonText: { color: colors.primary[200], fontSize: 8, letterSpacing: 0.5, fontWeight: '700' },
  logout: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 13 }, logoutText: { color: colors.status.error, fontSize: 12, fontWeight: '700' }, logoutArrow: { color: colors.status.error },
});
