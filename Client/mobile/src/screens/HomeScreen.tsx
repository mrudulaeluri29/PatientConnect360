import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <Text style={styles.logo}>MediHealth</Text>
        <View style={styles.navActions}>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

        {/* Hero Section */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <LinearGradient
              colors={['rgba(66, 50, 110, 0.90)', 'rgba(110, 91, 154, 0.80)']}
              style={styles.heroOverlay}
            >
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle1}>YOUR HEALTH,</Text>
                <Text style={styles.heroTitle2}>CONNECTED</Text>
                <Text style={styles.heroTitle3}>YOUR CARE, SIMPLIFIED</Text>
                <Text style={styles.heroSubtitle}>
                  Seamlessly connect with your healthcare team, manage appointments, 
                  and access your medical records—all in one secure platform.
                </Text>
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.primaryButtonText}>Get Started Free</Text>
                </TouchableOpacity>
                <Text style={styles.ctaNote}>Secure • HIPAA Compliant • Free</Text>
              </View>
            </LinearGradient>
          </View>

        {/* Features Section */}
        <View style={styles.features}>
          <Text style={styles.sectionTitle}>Everything you need for better health management</Text>
          
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Appointments? Managed</Text>
              <Text style={styles.featureDescription}>
                Never miss an appointment again. Schedule, reschedule, and manage 
                your healthcare appointments all in one place.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Messages? Connected</Text>
              <Text style={styles.featureDescription}>
                Communicate directly with your care team. Get quick answers, 
                share updates, and stay connected with your healthcare providers.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Records? Accessible</Text>
              <Text style={styles.featureDescription}>
                Access your medical records, test results, and health history 
                anytime, anywhere. Your health data at your fingertips.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Care Team? Unified</Text>
              <Text style={styles.featureDescription}>
                Connect patients, caregivers, clinicians, and administrators 
                in one integrated platform for coordinated care.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Reminders? Set</Text>
              <Text style={styles.featureDescription}>
                Never forget medications, appointments, or important health 
                reminders with personalized notifications.
              </Text>
            </View>

            <View style={styles.featureCard}>
              <Text style={styles.featureTitle}>Security? Guaranteed</Text>
              <Text style={styles.featureDescription}>
                Your health information is protected with enterprise-grade 
                security and HIPAA compliance standards.
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.about}>
          <View style={styles.aboutContent}>
            <View style={styles.aboutImagePlaceholder}>
              <Text style={styles.aboutImageText}>Healthcare Professional</Text>
            </View>
            <View style={styles.aboutText}>
              <Text style={styles.aboutTitle}>Built for modern healthcare</Text>
              <Text style={styles.aboutDescription}>
                MediHealth is designed to bridge the gap between patients 
                and their healthcare providers. Whether you're a patient managing 
                your health, a caregiver supporting a loved one, a clinician 
                providing care, or an administrator overseeing operations—we've 
                got you covered.
              </Text>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>100%</Text>
                  <Text style={styles.statLabel}>HIPAA Compliant</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>24/7</Text>
                  <Text style={styles.statLabel}>Access</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statNumber}>Secure</Text>
                  <Text style={styles.statLabel}>Encrypted</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.ctaSection}
        >
          <Text style={styles.ctaTitle}>Ready to take control of your health?</Text>
          <Text style={styles.ctaSubtitle}>
            Join thousands of patients and healthcare providers using MediHealth
          </Text>
          <View style={styles.ctaButtons}>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.ctaButtonText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.ctaButtonSecondary}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.ctaButtonSecondaryText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  navActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loginButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  loginButtonText: {
    color: colors.primary,
    fontWeight: '500',
    fontSize: 16,
  },
  hero: {
    height: height * 0.7,
    position: 'relative',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  heroContent: {
    alignItems: 'center',
    maxWidth: width * 0.9,
  },
  heroTitle1: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.secondaryLight,
    marginBottom: spacing.xs,
  },
  heroTitle2: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.background,
    marginBottom: spacing.xs,
  },
  heroTitle3: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.background,
    marginBottom: spacing.md,
  },
  heroSubtitle: {
    fontSize: 16,
    color: colors.background,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  ctaNote: {
    fontSize: 14,
    color: colors.background,
    opacity: 0.9,
  },
  features: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  featuresGrid: {
    gap: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  featureDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  about: {
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  aboutContent: {
    gap: spacing.lg,
  },
  aboutImagePlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    marginBottom: spacing.md,
    backgroundColor: colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutImageText: {
    fontSize: 18,
    color: colors.primaryDark,
    fontWeight: '500',
  },
  aboutText: {
    gap: spacing.md,
  },
  aboutTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  aboutDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ctaSection: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 18,
    color: colors.background,
    opacity: 0.9,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  ctaButton: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  ctaButtonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonSecondaryText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
});

