import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { login } from '../api/auth';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export default function LoginScreen({ navigation }: Props) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!emailOrUsername || !password) {
      setError('Please enter both email/username and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // TODO: Implement actual login API call
      // const response = await login({ emailOrUsername, password });
      // await AsyncStorage.setItem('auth_token', response.token);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: Navigate based on role
      // if (response.user.role === 'ADMIN') {
      //   navigation.navigate('AdminDashboard');
      // } else {
      //   navigation.navigate('Dashboard');
      // }
      
      // Temporary: navigate to dashboard
      navigation.navigate('Dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.secondaryVeryLight, colors.secondaryLight]}
          style={styles.background}
        >
          <View style={styles.loginContainer}>
            {/* Left Panel - Branding */}
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.leftPanel}
            >
              <View style={styles.branding}>
                <Text style={styles.logo}>MediHealth</Text>
                <Text style={styles.welcomeTitle}>Welcome Back</Text>
                <Text style={styles.welcomeSubtitle}>
                  Sign in to access your health portal and connect with your care team
                </Text>
              </View>
              
              <View style={styles.features}>
                <Text style={styles.featureItem}>Secure & HIPAA Compliant</Text>
                <Text style={styles.featureItem}>Connect with Care Team</Text>
                <Text style={styles.featureItem}>Manage Appointments</Text>
                <Text style={styles.featureItem}>Access Medical Records</Text>
              </View>
            </LinearGradient>

            {/* Right Panel - Login Form */}
            <View style={styles.rightPanel}>
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Sign In</Text>
                <Text style={styles.formSubtitle}>
                  Enter your credentials to access your account
                </Text>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email or Username</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email or username"
                      placeholderTextColor={colors.textLight}
                      value={emailOrUsername}
                      onChangeText={setEmailOrUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordInputWrapper}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Enter your password"
                        placeholderTextColor={colors.textLight}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        <Text style={styles.passwordToggleText}>
                          {showPassword ? 'Hide' : 'Show'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formOptions}>
                    <TouchableOpacity style={styles.checkboxContainer}>
                      <Text style={styles.checkboxLabel}>Remember me</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      // TODO: Navigate to ForgotPassword screen when implemented
                      Alert.alert('Forgot Password', 'Forgot password screen coming soon');
                    }}>
                      <Text style={styles.forgotPassword}>Forgot password?</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Don't have an account?</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.signupButton}
                    onPress={() => navigation.navigate('Register')}
                  >
                    <Text style={styles.signupButtonText}>Create an account</Text>
                  </TouchableOpacity>

                  <View style={styles.roleInfo}>
                    <Text style={styles.roleInfoTitle}>Available for:</Text>
                    <View style={styles.roleBadges}>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Patient</Text>
                      </View>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Caregiver</Text>
                      </View>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Clinician</Text>
                      </View>
                      <View style={[styles.roleBadge, styles.roleBadgeAdmin]}>
                        <Text style={[styles.roleBadgeText, styles.roleBadgeAdminText]}>Admin</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  background: {
    flex: 1,
    padding: spacing.md,
  },
  loginContainer: {
    flex: 1,
    flexDirection: width > 768 ? 'row' : 'column',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 60,
    elevation: 20,
    minHeight: 600,
  },
  leftPanel: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  branding: {
    gap: spacing.md,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.background,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.background,
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.background,
    opacity: 0.95,
    lineHeight: 24,
  },
  features: {
    gap: spacing.md,
  },
  featureItem: {
    fontSize: 16,
    color: colors.background,
    opacity: 0.95,
  },
  rightPanel: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  passwordToggle: {
    padding: spacing.md,
    paddingLeft: spacing.sm,
  },
  passwordToggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  formOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  forgotPassword: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signupButton: {
    borderWidth: 2,
    borderColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  signupButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  roleInfo: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  roleInfoTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  roleBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  roleBadgeAdmin: {
    backgroundColor: colors.secondaryLight,
  },
  roleBadgeAdminText: {
    color: colors.primaryDark,
  },
});

