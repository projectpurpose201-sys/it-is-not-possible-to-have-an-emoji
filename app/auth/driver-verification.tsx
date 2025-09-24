import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../utils/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function DriverVerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    rcDocument: null as any,
    licenseDocument: null as any,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.aadhaarNumber.trim()) {
      newErrors.aadhaarNumber = 'Aadhaar number is required';
    } else if (!/^\d{12}$/.test(formData.aadhaarNumber.replace(/\s/g, ''))) {
      newErrors.aadhaarNumber = 'Please enter a valid 12-digit Aadhaar number';
    }

    if (!formData.rcDocument) {
      newErrors.rcDocument = 'RC document is required';
    }

    if (!formData.licenseDocument) {
      newErrors.licenseDocument = 'License document is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickDocument = async (type: 'rc' | 'license') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const document = result.assets[0];
        if (type === 'rc') {
          setFormData(prev => ({ ...prev, rcDocument: document }));
          if (errors.rcDocument) {
            setErrors(prev => ({ ...prev, rcDocument: '' }));
          }
        } else {
          setFormData(prev => ({ ...prev, licenseDocument: document }));
          if (errors.licenseDocument) {
            setErrors(prev => ({ ...prev, licenseDocument: '' }));
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (document: any, fileName: string): Promise<string | null> => {
    try {
      const fileExt = document.name.split('.').pop();
      const filePath = `driver-docs/${user?.id}/${fileName}.${fileExt}`;

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: document.uri,
        type: document.mimeType,
        name: document.name,
      } as any);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, formData);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Upload documents
      const rcUrl = await uploadDocument(formData.rcDocument, 'rc');
      const licenseUrl = await uploadDocument(formData.licenseDocument, 'license');

      if (!rcUrl || !licenseUrl) {
        Alert.alert('Error', 'Failed to upload documents');
        return;
      }

      // Save driver documents to database
      const { error } = await supabase
        .from('driver_docs')
        .insert({
          driver_id: user?.id,
          aadhaar_number: formData.aadhaarNumber.replace(/\s/g, ''),
          rc_document_url: rcUrl,
          license_document_url: licenseUrl,
          status: 'pending_verification',
        });

      if (error) throw error;

      Alert.alert(
        'Documents Submitted',
        'Your documents have been submitted for verification. You will be notified once approved.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/driver'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAadhaar = (value: string) => {
    // Format Aadhaar number with spaces
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    setFormData(prev => ({ ...prev, aadhaarNumber: formatted }));
    if (errors.aadhaarNumber) {
      setErrors(prev => ({ ...prev, aadhaarNumber: '' }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Driver Verification</Text>
              <Text style={styles.subtitle}>
                Upload your documents for verification
              </Text>
            </View>

            <Card style={styles.formCard}>
              <Input
                label="Aadhaar Number"
                value={formData.aadhaarNumber}
                onChangeText={updateAadhaar}
                error={errors.aadhaarNumber}
                leftIcon="card"
                placeholder="1234 5678 9012"
                keyboardType="numeric"
                maxLength={14}
              />

              <View style={styles.documentSection}>
                <Text style={styles.documentLabel}>RC Document</Text>
                <Button
                  title={formData.rcDocument ? 'RC Document Selected' : 'Upload RC Document'}
                  onPress={() => pickDocument('rc')}
                  variant={formData.rcDocument ? 'secondary' : 'outline'}
                  style={styles.documentButton}
                />
                {formData.rcDocument && (
                  <Text style={styles.documentName}>{formData.rcDocument.name}</Text>
                )}
                {errors.rcDocument && (
                  <Text style={styles.errorText}>{errors.rcDocument}</Text>
                )}
              </View>

              <View style={styles.documentSection}>
                <Text style={styles.documentLabel}>Driving License</Text>
                <Button
                  title={formData.licenseDocument ? 'License Document Selected' : 'Upload License Document'}
                  onPress={() => pickDocument('license')}
                  variant={formData.licenseDocument ? 'secondary' : 'outline'}
                  style={styles.documentButton}
                />
                {formData.licenseDocument && (
                  <Text style={styles.documentName}>{formData.licenseDocument.name}</Text>
                )}
                {errors.licenseDocument && (
                  <Text style={styles.errorText}>{errors.licenseDocument}</Text>
                )}
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  📋 Your documents will be reviewed by our team. You'll receive a notification once approved.
                </Text>
              </View>

              <Button
                title="Submit Documents"
                onPress={handleSubmit}
                loading={loading}
                style={styles.submitButton}
              />
            </Card>

            <Button
              title="← Back"
              onPress={() => router.back()}
              variant="ghost"
              style={styles.backButton}
              textStyle={styles.backText}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.heading2,
    color: '#fff',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginBottom: theme.spacing.lg,
  },
  documentSection: {
    marginBottom: theme.spacing.lg,
  },
  documentLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  documentButton: {
    marginBottom: theme.spacing.sm,
  },
  documentName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  infoBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
  },
});
