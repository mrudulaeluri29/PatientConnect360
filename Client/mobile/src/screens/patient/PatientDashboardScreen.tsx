import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function PatientDashboardScreen() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'messages'>('overview');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Refresh data
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>MediHealth</Text>
          <Text style={styles.welcome}>Welcome, {user?.username || 'Patient'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'visits' && styles.tabActive]}
          onPress={() => setActiveTab('visits')}
        >
          <Text style={[styles.tabText, activeTab === 'visits' && styles.tabTextActive]}>
            Visits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {activeTab === 'overview' && (
          <View>
            <Text style={styles.sectionTitle}>Your Health Summary</Text>
            
            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📅 Upcoming Appointments</Text>
              </View>
              <Text style={styles.cardSubtitle}>No upcoming appointments</Text>
              <Button
                title="Schedule Visit"
                onPress={() => setActiveTab('visits')}
                variant="outline"
                size="small"
                style={styles.cardButton}
              />
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>💊 Medications</Text>
              </View>
              <Text style={styles.cardSubtitle}>No active medications</Text>
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>📊 Health Metrics</Text>
              </View>
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Blood Pressure</Text>
                  <Text style={styles.metricValue}>--/--</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Heart Rate</Text>
                  <Text style={styles.metricValue}>-- bpm</Text>
                </View>
              </View>
            </Card>

            <Card>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>💬 Messages</Text>
              </View>
              <Text style={styles.cardSubtitle}>No new messages</Text>
              <Button
                title="View Messages"
                onPress={() => setActiveTab('messages')}
                variant="outline"
                size="small"
                style={styles.cardButton}
              />
            </Card>
          </View>
        )}

        {activeTab === 'visits' && (
          <View>
            <Text style={styles.sectionTitle}>Appointments</Text>
            <Card>
              <Text style={styles.emptyState}>No upcoming appointments</Text>
              <Text style={styles.emptySubtext}>Schedule your next visit with your care team</Text>
              <Button
                title="Schedule Appointment"
                onPress={() => {}}
                variant="primary"
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </Card>
          </View>
        )}

        {activeTab === 'messages' && (
          <View>
            <Text style={styles.sectionTitle}>Messages</Text>
            <Card>
              <Text style={styles.emptyState}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation with your care team</Text>
              <Button
                title="New Message"
                onPress={() => {}}
                variant="primary"
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl + 20,
    paddingBottom: spacing.lg,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  welcome: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  logoutText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cardButton: {
    marginTop: spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
