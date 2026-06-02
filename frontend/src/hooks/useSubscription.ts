import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from './useAuth';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxStudents: number;
  maxGroups: number;
  maxTeachers: number;
  hasTelegram: boolean;
  hasExcelExport: boolean;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
  historyMonths: number;
  description: string;
}

interface CurrentSubscription {
  subscription: any;
  plan: SubscriptionPlan;
  usage: {
    students: { current: number; limit: number };
    groups: { current: number; limit: number };
  };
  trialUsed: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSubscription();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/current');
      setSubscription(response.data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFeature = async (feature: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await api.get(`/subscriptions/check-feature/${feature}`);
      return response.data.available;
    } catch (error) {
      console.error('Error checking feature:', error);
      return false;
    }
  };

  const hasFeature = (feature: 'telegram' | 'excel' | 'analytics' | 'api'): boolean => {
    if (!subscription) return false;

    switch (feature) {
      case 'telegram':
        return subscription.plan.hasTelegram;
      case 'excel':
        return subscription.plan.hasExcelExport;
      case 'analytics':
        return subscription.plan.hasAnalytics;
      case 'api':
        return subscription.plan.hasApiAccess;
      default:
        return false;
    }
  };

  const isWithinLimit = (type: 'students' | 'groups'): boolean => {
    if (!subscription) return false;

    const usage = subscription.usage[type];
    return usage.current < usage.limit;
  };

  const getUsagePercentage = (type: 'students' | 'groups'): number => {
    if (!subscription) return 0;

    const usage = subscription.usage[type];
    return (usage.current / usage.limit) * 100;
  };

  const canAddStudent = (): boolean => {
    return isWithinLimit('students');
  };

  const canAddGroup = (): boolean => {
    return isWithinLimit('groups');
  };

  return {
    subscription,
    loading,
    hasFeature,
    checkFeature,
    isWithinLimit,
    getUsagePercentage,
    canAddStudent,
    canAddGroup,
    refreshSubscription: fetchSubscription
  };
}