import { Link } from 'react-router-dom';
import { Crown, AlertCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

export default function SubscriptionStatus() {
  const { subscription, loading } = useSubscription();

  if (loading || !subscription) {
    return null;
  }

  const isNearLimit = (type: 'students' | 'groups') => {
    const usage = subscription.usage[type];
    return (usage.current / usage.limit) > 0.8;
  };

  const isAtLimit = (type: 'students' | 'groups') => {
    const usage = subscription.usage[type];
    return usage.current >= usage.limit;
  };

  const planColor = subscription.plan.name === 'FREE' ? 'gray' :
                   subscription.plan.name === 'TEACHER' ? 'blue' : 'purple';

  const showWarning = isNearLimit('students') || isNearLimit('groups');
  const showError = isAtLimit('students') || isAtLimit('groups');

  return (
    <div className="flex items-center gap-4">
      {/* Plan Badge */}
      <Link
        to="/pricing"
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors
          ${subscription.plan.name === 'FREE'
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : subscription.plan.name === 'TEACHER'
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          }`}
      >
        <Crown className="w-4 h-4" />
        <span>{subscription.plan.name}</span>
      </Link>

      {/* Usage Warning */}
      {showWarning && !showError && (
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Приближаетесь к лимитам</span>
        </div>
      )}

      {/* Usage Error */}
      {showError && (
        <Link
          to="/pricing"
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Лимит достигнут</span>
        </Link>
      )}

      {/* Trial Status */}
      {subscription.subscription?.status === 'TRIAL' && (
        <div className="text-sm text-blue-600">
          Пробный период до {new Date(subscription.subscription.endDate).toLocaleDateString('ru-RU')}
        </div>
      )}
    </div>
  );
}