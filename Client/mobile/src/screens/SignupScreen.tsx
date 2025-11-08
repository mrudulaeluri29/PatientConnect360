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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../styles/colors';
import { spacing } from '../styles/spacing';
import { validatePassword, validateEmail, validateUsername } from '../utils/validation';
import { register } from '../api/auth';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type SignupScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface Props {
  navigation: SignupScreenNavigationProp;
}

export default function SignupScreen({ navigation }: Props) {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'PATIENT',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; errors: string[] }>({
    isValid: false,
    errors: [],
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    if (field === 'password') {
      const validation = validatePassword(value);
      setPasswordValidation(validation);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (!validateUsername(formData.username)) {
      newErrors.username = 'Username must be 3-20 characters and contain only letters, numbers, and underscores';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordValidation.isValid) {
      newErrors.password = 'Password does not meet requirements';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
      });
      
      navigation.navigate('Login');
    } catch (err: any) {
      setErrors({ submit: err.response?.data?.error || 'Registration failed. Please try again.' });
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
          <View style={styles.signupContainer}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.leftPanel}
            >
              <View style={styles.branding}>
                <Text style={styles.logo}>MediHealth</Text>
                <Text style={styles.welcomeTitle}>Create Account</Text>
                <Text style={styles.welcomeSubtitle}>
                  Join MediHealth to manage your health, connect with your care team, and access your medical records
                </Text>
              </View>
              
              <View style={styles.features}>
                <Text style={styles.featureItem}>Secure & HIPAA Compliant</Text>
                <Text style={styles.featureItem}>24/7 Access to Records</Text>
                <Text style={styles.featureItem}>Connect with Care Team</Text>
                <Text style={styles.featureItem}>Manage Appointments</Text>
              </View>
            </LinearGradient>

            <View style={styles.rightPanel}>
              <View style={styles.formContainer}>
                <Text style={styles.formTitle}>Sign Up</Text>
                <Text style={styles.formSubtitle}>Create your account to get started</Text>

                {errors.submit ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errors.submit}</Text>
                  </View>
                ) : null}

                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={[styles.input, errors.email && styles.inputError]}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.textLight}
                      value={formData.email}
                      onChangeText={(value) => handleChange('email', value)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                      style={[styles.input, errors.username && styles.inputError]}
                      placeholder="Choose a username"
                      placeholderTextColor={colors.textLight}
                      value={formData.username}
                      onChangeText={(value) => handleChange('username', value)}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    {errors.username && <Text style={styles.fieldError}>{errors.username}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Role</Text>
                    <View style={styles.roleSelector}>
                      {['PATIENT', 'CAREGIVER', 'CLINICIAN'].map((role) => (
                        <TouchableOpacity
                          key={role}
                          style={[
                            styles.roleOption,
                            formData.role === role && styles.roleOptionSelected,
                          ]}
                          onPress={() => handleChange('role', role)}
                          disabled={loading}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              formData.role === role && styles.roleOptionTextSelected,
                            ]}
                          >
                            {role.charAt(0) + role.slice(1).toLowerCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={[styles.passwordInputWrapper, errors.password && styles.inputError]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Create a password"
                        placeholderTextColor={colors.textLight}
                        value={formData.password}
                        onChangeText={(value) => handleChange('password', value)}
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
                    {formData.password ? (
                      <View style={styles.passwordRequirements}>
                        <Text style={styles.requirementTitle}>Password must contain:</Text>
                        <View style={styles.requirementList}>
                          <Text style={[styles.requirementItem, formData.password.length >= 10 && styles.requirementMet]}>
                            {formData.password.length >= 10 ? '✓' : '○'} At least 10 characters
                          </Text>
                          <Text style={[styles.requirementItem, /[A-Z]/.test(formData.password) && styles.requirementMet]}>
                            {/[A-Z]/.test(formData.password) ? '✓' : '○'} One capital letter
                          </Text>
                          <Text style={[styles.requirementItem, /[a-z]/.test(formData.password) && styles.requirementMet]}>
                            {/[a-z]/.test(formData.password) ? '✓' : '○'} One lowercase letter
                          </Text>
                          <Text style={[styles.requirementItem, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) && styles.requirementMet]}>
                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'} One special character
                          </Text>
                        </View>
                      </View>
                    ) : null}
                    {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={[styles.passwordInputWrapper, errors.confirmPassword && styles.inputError]}>
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Confirm your password"
                        placeholderTextColor={colors.textLight}
                        value={formData.confirmPassword}
                        onChangeText={(value) => handleChange('confirmPassword', value)}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!loading}
                      />
                      <TouchableOpacity
                        style={styles.passwordToggle}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                      >
                        <Text style={styles.passwordToggleText}>
                          {showConfirmPassword ? 'Hide' : 'Show'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}
                  </View>

                  <TouchableOpacity
                    style={[styles.signupButton, (loading || !passwordValidation.isValid) && styles.signupButtonDisabled]}
                    onPress={handleSignup}
                    disabled={loading || !passwordValidation.isValid}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.background} />
                    ) : (
                      <Text style={styles.signupButtonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>Already have an account?</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={() => navigation.navigate('Login')}
                  >
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  </TouchableOpacity>
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
  signupContainer: {
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
    minHeight: 700,
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
  inputError: {
    borderColor: colors.error,
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
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  roleOption: {
    flex: 1,
    minWidth: 100,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  roleOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  roleOptionTextSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  passwordRequirements: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
  },
  requirementTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  requirementList: {
    gap: spacing.xs,
  },
  requirementItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  requirementMet: {
    color: colors.success,
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  signupButton: {
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
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
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
  loginButton: {
    borderWidth: 2,
    borderColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

