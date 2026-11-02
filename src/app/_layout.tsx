import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';

// ── Pantallas Cliente ──────────────────────────────────────────────────────────
import ExplorarScreen      from '@/screens/cliente/ExplorarScreen';
import MisCitasScreen      from '@/screens/cliente/MisCitasScreen';
import RecompensasScreen   from '@/screens/cliente/RecompensasScreen';
import ServiciosScreen     from '@/screens/cliente/ServiciosScreen';
import MiPerfilScreen      from '@/screens/cliente/MiPerfilScreen';

// ── Pantallas Admin ────────────────────────────────────────────────────────────
import AgendaYossScreen        from '@/screens/admin/AgendaYossScreen';
import ExpedientesScreen       from '@/screens/admin/ExpedientesScreen';
import PanelGestionScreen      from '@/screens/admin/PanelGestionScreen';
import RecompensasAdminScreen  from '@/screens/admin/RecompensasAdminScreen';

import { theme } from '@/constants/YossTheme';

const { colors, borderRadius, shadow, spacing } = theme;

// ── Tipos ──────────────────────────────────────────────────────────────────────
type AuthScreen  = 'login' | 'register';
type ClienteTab  = 'explorar' | 'citas' | 'recompensas' | 'servicios' | 'perfil';
type AdminTab    = 'agenda' | 'expedientes' | 'recompensas' | 'panel';

// ─────────────────────────────────────────────────────────────────────────────
//  FLUJO DE AUTENTICACIÓN
// ─────────────────────────────────────────────────────────────────────────────
function AuthNavigator() {
  const [screen, setScreen] = useState<AuthScreen>('login');
  if (screen === 'register') {
    return <RegisterScreen onNavigateToLogin={() => setScreen('login')} />;
  }
  return <LoginScreen onNavigateToRegister={() => setScreen('register')} />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  NAVEGACIÓN CLIENTE — 5 tabs con Recompensas en el centro destacado
// ─────────────────────────────────────────────────────────────────────────────
function ClienteNavigator() {
  const [activeTab, setActiveTab] = useState<ClienteTab>('explorar');

  type ClienteTabDef = { key: ClienteTab; label: string; icon: string; center?: boolean };
  const tabs: ClienteTabDef[] = [
    { key: 'explorar',    label: 'Explorar',    icon: '🌿' },
    { key: 'citas',       label: 'Mis Citas',   icon: '📅' },
    { key: 'recompensas', label: 'Club',        icon: '✦',  center: true },
    { key: 'servicios',   label: 'Servicios',   icon: '✂' },
    { key: 'perfil',      label: 'Mi Perfil',   icon: '👤' },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'explorar':    return <ExplorarScreen />;
      case 'citas':       return <MisCitasScreen />;
      case 'recompensas': return <RecompensasScreen />;
      case 'servicios':   return <ServiciosScreen />;
      case 'perfil':      return <MiPerfilScreen />;
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.screenContainer}>{renderScreen()}</View>

      <View style={s.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          // ── Tab central de Recompensas (estilo Cinépolis FAB) ──
          if (tab.center) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={s.centerTabWrapper}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.85}
                accessible
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <View style={[s.centerTab, isActive && s.centerTabActive]}>
                  <Text style={s.centerTabIcon}>{tab.icon}</Text>
                </View>
                <Text style={[s.centerTabLabel, isActive && s.centerTabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              accessible
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {isActive && <View style={s.tabIndicator} />}
              <Text style={[s.tabIcon, isActive && s.tabIconActive]}>{tab.icon}</Text>
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  NAVEGACIÓN ADMIN
// ─────────────────────────────────────────────────────────────────────────────
function AdminNavigator() {
  const [activeTab, setActiveTab] = useState<AdminTab>('agenda');

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'agenda',       label: 'Agenda',       icon: '🗓️' },
    { key: 'expedientes',  label: 'Expedientes',  icon: '📋' },
    { key: 'recompensas',  label: 'Beneficios',   icon: '✦' },
    { key: 'panel',        label: 'Panel',        icon: '⚙️' },
  ];

  const renderScreen = () => {
    switch (activeTab) {
      case 'agenda':      return <AgendaYossScreen />;
      case 'expedientes': return <ExpedientesScreen />;
      case 'recompensas': return <RecompensasAdminScreen />;
      case 'panel':       return <PanelGestionScreen />;
    }
  };

  return (
    <SafeAreaView style={[s.safeArea, s.safeAreaAdmin]}>
      <View style={s.adminBanner}>
        <Text style={s.adminBannerText}>MODO ADMINISTRADOR — YOSS</Text>
      </View>
      <View style={s.screenContainer}>{renderScreen()}</View>
      <View style={[s.tabBar, s.tabBarAdmin]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={s.tabItem}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
              accessible
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              {isActive && <View style={s.tabIndicatorAdmin} />}
              <Text style={[s.tabIcon, isActive && s.tabIconActive]}>{tab.icon}</Text>
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PANTALLA DE CUENTA BLOQUEADA
// ─────────────────────────────────────────────────────────────────────────────
function BlockedScreen() {
  const { logout } = useAuth();
  return (
    <SafeAreaView style={s.blockedContainer}>
      <View style={s.blockedIcon}><View style={s.blockedBar} /></View>
      <Text style={s.blockedTitle}>Cuenta Suspendida</Text>
      <Text style={s.blockedBody}>
        Tu cuenta ha sido suspendida por acumular 3 cancelaciones.{'\n'}
        Comunícate con Yoss Beauty Salon para reactivarla.
      </Text>
      <TouchableOpacity style={s.btn} onPress={logout}>
        <Text style={s.btnText}>Volver al inicio</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTER RAÍZ
// ─────────────────────────────────────────────────────────────────────────────
function RootRouter() {
  const { userRole, isBlocked } = useAuth();
  if (userRole === null)    return <AuthNavigator />;
  if (isBlocked)            return <BlockedScreen />;
  if (userRole === 'admin') return <AdminNavigator />;
  return <ClienteNavigator />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESTILOS
// ─────────────────────────────────────────────────────────────────────────────
const TABBAR_HEIGHT = Platform.OS === 'ios' ? 82 : 70;

const s = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.beige[50] },
  safeAreaAdmin: { backgroundColor: colors.ink[50] },
  screenContainer: { flex: 1 },

  // ── Admin banner ──
  adminBanner: { backgroundColor: colors.ink[800], paddingVertical: 7, alignItems: 'center' },
  adminBannerText: { color: colors.primary[300], fontSize: 10, fontWeight: '600', letterSpacing: 2.5 },

  // ── Tab Bar base ──
  tabBar: {
    flexDirection: 'row',
    height: TABBAR_HEIGHT,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.beige[200],
    ...shadow.card,
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    paddingTop: 6,
    alignItems: 'center',
  },
  tabBarAdmin: {
    backgroundColor: colors.ink[50],
    borderTopColor: colors.beige[200],
  },

  // ── Tab item normal ──
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: -6,
    left: '20%',
    right: '20%',
    height: 2,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.pill,
  },
  tabIndicatorAdmin: {
    position: 'absolute',
    top: -6,
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.pill,
  },
  tabIcon:        { fontSize: 20, opacity: 0.4 },
  tabIconActive:  { opacity: 1 },
  tabLabel:       { fontSize: 9, color: colors.beige[400], marginTop: 2, fontWeight: '500' },
  tabLabelActive: { color: colors.primary[500], fontWeight: '700' },

  // ── Tab CENTRAL (Recompensas) estilo FAB ──
  centerTabWrapper: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 2,
    position: 'relative',
  },
  centerTab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...shadow.button,
    // Flota sobre el tabBar
    marginTop: -24,
  },
  centerTabActive: {
    backgroundColor: colors.primary[600],
    transform: [{ scale: 1.05 }],
  },
  centerTabIcon: { fontSize: 22, color: colors.white },
  centerTabLabel: { fontSize: 9, color: colors.beige[400], fontWeight: '600' },
  centerTabLabelActive: { color: colors.primary[500], fontWeight: '700' },

  // ── Cuenta bloqueada ──
  blockedContainer: { flex: 1, backgroundColor: colors.beige[50], alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  blockedIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: colors.status.error, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg },
  blockedBar: { width: 24, height: 3, backgroundColor: colors.status.error, borderRadius: 2 },
  blockedTitle: { fontSize: 24, fontWeight: '700', color: colors.status.error, marginBottom: spacing.md, textAlign: 'center' },
  blockedBody: { fontSize: 14, color: colors.ink[700], textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  btn: { backgroundColor: colors.primary[500], borderRadius: borderRadius.button, paddingVertical: 14, paddingHorizontal: 36, ...shadow.button },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
});
