import React, { useState, useMemo } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { PageHeader, SectionTitle, StatusPill, pageStyles as p } from '@/components/SalonUI';
import { useSalon } from '@/context/SalonContext';
import { theme } from '@/constants/YossTheme';

const { colors } = theme;

export default function ExpedientesScreen() {
  const { clientsList, appointments } = useSalon();
  const [selectedId, setSelectedId] = useState<string>('');

  const records = useMemo(() => {
    return clientsList.map((client) => {
      const clientApts = appointments.filter((a) => a.clientId === client.id);
      const lastApt = clientApts[0];
      return {
        id: client.id,
        client: client.name,
        initials: client.initials,
        avatarUri: client.avatarUri,
        phone: client.phone,
        service: lastApt ? lastApt.service : 'Sin citas registradas aún',
        date: lastApt ? `${lastApt.date} · ${lastApt.time}` : 'Cuenta recién creada',
        hair: client.hair,
        allergies: client.allergies,
        visits: client.totalVisits,
        spent: client.totalSpent,
        level: client.level,
      };
    });
  }, [clientsList, appointments]);

  return (
    <ScrollView style={p.page} contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>
      <PageHeader
        eyebrow="Panel administrador"
        title="Expedientes"
        subtitle="Perfiles clínicos capilares y seguimiento de clientas registradas."
      />
      <View style={[p.card, styles.secureNote]}>
        <Text style={styles.secureIcon}>✧</Text>
        <Text style={[p.muted, { flex: 1 }]}>
          Expedientes sincronizados en tiempo real con la base de datos de Yoss Beauty Salon.
        </Text>
      </View>

      <View>
        <SectionTitle title="Clientas registradas" action={`${records.length} perfiles`} />
        {records.length === 0 ? (
          <View style={[p.card, styles.emptyCard]}>
            <Text style={{ fontSize: 32 }}>📋</Text>
            <Text style={styles.client}>Aún no hay clientas registradas</Text>
            <Text style={[p.muted, { textAlign: 'center' }]}>
              Cuando las clientas creen su cuenta en la app, su ficha capilar, alergias e historial aparecerán aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.recordList}>
            {records.map((record) => {
              const isOpen = selectedId === record.id;
              return (
                <TouchableOpacity
                  key={record.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedId(isOpen ? '' : record.id)}
                  style={[p.card, styles.record, isOpen && styles.recordSelected]}
                >
                  <View style={p.row}>
                    <View style={styles.avatar}>
                      {record.avatarUri ? (
                        <Image source={{ uri: record.avatarUri }} style={styles.avatarPhoto} contentFit="cover" />
                      ) : (
                        <Text style={styles.initials}>{record.initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.client}>{record.client}</Text>
                      <Text style={p.muted}>{record.date} · Tel: {record.phone}</Text>
                    </View>
                    <Text style={styles.expand}>{isOpen ? '−' : '+'}</Text>
                  </View>

                  <View style={styles.serviceBox}>
                    <Text style={styles.serviceLabel}>ÚLTIMO SERVICIO / ESTADO</Text>
                    <Text style={styles.service}>{record.service}</Text>
                  </View>

                  {isOpen && (
                    <View style={styles.clinical}>
                      <View style={p.row}>
                        <Text style={styles.clinicalTitle}>Perfil clínico</Text>
                        <StatusPill label={`Nivel ${record.level}`} tone="olive" />
                      </View>
                      <Clinical label="Cabello" value={record.hair} />
                      <Clinical label="Alergias" value={record.allergies} />
                      <Clinical
                        label="Historial Club Yoss"
                        value={`${record.visits} visitas completadas · $${record.spent.toLocaleString()} MXN acumulados`}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {records.length > 0 && (
        <Text style={styles.footnote}>Selecciona una clienta para ver los detalles de su perfil.</Text>
      )}
    </ScrollView>
  );
}

function Clinical({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.clinicalRow}>
      <Text style={styles.clinicalLabel}>{label}</Text>
      <Text style={styles.clinicalValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  secureNote: { backgroundColor: colors.beige[100], flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  secureIcon: { fontSize: 20, color: colors.primary[500] },
  emptyCard: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  recordList: { gap: 10 },
  record: { gap: 12, padding: 14 },
  recordSelected: { borderColor: colors.primary[300] },
  avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPhoto: { width: 38, height: 38, borderRadius: 14 },
  initials: { color: colors.primary[600], fontSize: 11, fontWeight: '700' },
  client: { color: colors.ink[800], fontSize: 13, fontWeight: '700' },
  expand: { color: colors.primary[500], fontSize: 23, fontWeight: '300' },
  serviceBox: { padding: 10, backgroundColor: colors.beige[50], borderRadius: 11 },
  serviceLabel: { color: colors.beige[500], fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  service: { color: colors.ink[800], fontSize: 12, fontWeight: '700', marginTop: 4 },
  clinical: { paddingTop: 4, gap: 8 },
  clinicalTitle: { color: colors.ink[800], fontWeight: '700', fontSize: 13 },
  clinicalRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.beige[100], gap: 3 },
  clinicalLabel: { color: colors.beige[500], fontWeight: '700', fontSize: 9, letterSpacing: 0.6 },
  clinicalValue: { color: colors.ink[700], fontSize: 11, lineHeight: 16 },
  footnote: { color: colors.beige[500], textAlign: 'center', fontSize: 10 },
});
