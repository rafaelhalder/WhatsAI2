import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { MetricsCards } from '../components/MetricsCards';
import { MessagesChart } from '../components/MessagesChart';
import { InstancesStatusChart } from '../components/InstancesStatusChart';
import { InstancesList } from '../components/InstancesList';
import { CostsChart } from '../components/CostsChart';
import { PeakHoursChart } from '../components/PeakHoursChart';
import { ActivityFeed } from '../components/ActivityFeed';
import { ResponseTimeStats } from '../components/ResponseTimeStats';
import { dashboardService } from '../services/dashboardService';
import { DashboardMetrics, MessageChartData, InstanceStatusData, CostData, ActivityLog } from '../types/dashboard';
import { userAuthStore } from '../../auth/store/authStore';
import OnboardingTour from '../../../components/onboarding/OnboardingTour';
import OnboardingChecklist from '../../../components/onboarding/OnboardingChecklist';
import WelcomeModal from '../../../components/onboarding/WelcomeModal';
import { onboardingService } from '../../../services/onboarding';

export const DashboardPage: React.FC = () => {
  const { token } = userAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [messageChartData, setMessageChartData] = useState<MessageChartData[]>([]);
  const [instanceStatusData, setInstanceStatusData] = useState<InstanceStatusData[]>([]);
  const [instancesList, setInstancesList] = useState<any[]>([]);
  const [costData, setCostData] = useState<CostData[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: number; count: number }[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [responseTimeStats, setResponseTimeStats] = useState<{ average: number; median: number; min: number; max: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [instancesLoading, setInstancesLoading] = useState(true);
  const [costsLoading, setCostsLoading] = useState(true);
  const [peakHoursLoading, setPeakHoursLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [responseTimeLoading, setResponseTimeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('list');
  
  // Onboarding state
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState({
    completed: false,
    step: 0
  });

  // Load onboarding status
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!token) return;
      
      try {
        const status = await onboardingService.getStatus(token);
        setOnboardingStatus({
          completed: status.onboardingCompleted,
          step: status.onboardingStep
        });
        
        // Show welcome modal if onboarding not completed
        if (!status.onboardingCompleted) {
          setShowWelcomeModal(true);
        }
      } catch (err) {
        console.error('Failed to load onboarding status:', err);
      }
    };
    
    loadOnboardingStatus();
  }, [token]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setChartLoading(true);
        setStatusLoading(true);
        setInstancesLoading(true);
        setCostsLoading(true);
        setPeakHoursLoading(true);
        setActivitiesLoading(true);
        setResponseTimeLoading(true);

        // Load all data in parallel
        const [
          metricsData, 
          chartData, 
          statusData, 
          instances,
          costs,
          peakHoursData,
          activitiesData,
          responseTime
        ] = await Promise.all([
          dashboardService.getMetrics(token),
          dashboardService.getMessageChart(token),
          dashboardService.getInstanceStatus(token),
          dashboardService.getInstancesList(token),
          dashboardService.getCostData(token),
          dashboardService.getPeakHours(token),
          dashboardService.getActivityLog(token),
          dashboardService.getResponseTimeStats(token)
        ]);

        setMetrics(metricsData);
        setMessageChartData(chartData);
        setInstanceStatusData(statusData);
        setInstancesList(instances);
        setCostData(costs);
        setPeakHours(peakHoursData);
        setActivities(activitiesData);
        setResponseTimeStats(responseTime);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados do dashboard');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
        setChartLoading(false);
        setStatusLoading(false);
        setInstancesLoading(false);
        setCostsLoading(false);
        setPeakHoursLoading(false);
        setActivitiesLoading(false);
        setResponseTimeLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleStartTour = () => {
    setShowWelcomeModal(false);
    setRunTour(true);
  };

  const handleSkipOnboarding = async () => {
    setShowWelcomeModal(false);
    setRunTour(false);
    if (token) {
      try {
        await onboardingService.skip(token);
        setOnboardingStatus({ completed: true, step: 0 });
      } catch (error) {
        console.error('Failed to skip onboarding:', error);
      }
    }
  };

  const handleCompleteTour = async () => {
    setRunTour(false);
    if (token) {
      try {
        await onboardingService.complete(token);
        setOnboardingStatus({ completed: true, step: 5 });
      } catch (error) {
        console.error('Failed to complete tour:', error);
      }
    }
  };

  // Calculate checklist items based on actual data
  // NOTE: Template, campaign, and automation counts would require additional
  // metrics from the backend. For MVP, these are marked as incomplete.
  // Future enhancement: Add templateCount, campaignCount, autoResponseCount to dashboard metrics
  const checklistItems = [
    {
      id: 'create-instance',
      title: 'Conectar WhatsApp',
      description: 'Conecte sua primeira conta WhatsApp',
      completed: (metrics?.activeInstances ?? 0) > 0 || instancesList.length > 0
    },
    {
      id: 'send-message',
      title: 'Enviar primeira mensagem',
      description: 'Envie sua primeira mensagem de teste',
      completed: (metrics?.totalMessages ?? 0) > 0
    },
    {
      id: 'create-template',
      title: 'Criar template',
      description: 'Crie um template de mensagem rápida',
      completed: false // TODO: Add templateCount to dashboard metrics
    },
    {
      id: 'create-campaign',
      title: 'Criar campanha',
      description: 'Configure sua primeira campanha',
      completed: false // TODO: Add campaignCount to dashboard metrics
    },
    {
      id: 'setup-automation',
      title: 'Configurar auto-resposta',
      description: 'Ative uma resposta automática',
      completed: false // TODO: Add autoResponseCount to dashboard metrics
    }
  ];

  return (
    <DashboardLayout>
      {/* Welcome Modal */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onStartTour={handleStartTour}
        onSkip={handleSkipOnboarding}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        run={runTour}
        onComplete={handleCompleteTour}
        onSkip={handleSkipOnboarding}
      />

      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-xl text-primary-content">
          <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Dashboard WhatsAI</h2>
          <p className="text-primary-content/80">
            Monitore o desempenho do seu sistema de mensagens WhatsApp em tempo real.
          </p>
        </div>

        {/* Onboarding Checklist - Show if not completed */}
        {!onboardingStatus.completed && (
          <OnboardingChecklist 
            items={checklistItems}
            onStartTour={handleStartTour}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Cards */}
        <MetricsCards
          metrics={metrics || {
            totalMessages: 0,
            activeInstances: 0,
            totalUsers: 0,
            deliveryRate: 0,
            storageUsed: 0,
            costs: {
              evolutionApi: 0,
              storage: 0,
              total: 0
            }
          }}
          loading={loading}
        />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MessagesChart data={messageChartData} loading={chartLoading} />

          <div className="bg-base-100 p-6 rounded-xl border border-base-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-base-content">Status das Instâncias</h3>
              
              {/* View Toggle */}
              <div className="join">
                <button
                  className={`join-item btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('list')}
                >
                  Lista
                </button>
                <button
                  className={`join-item btn btn-sm ${viewMode === 'chart' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setViewMode('chart')}
                >
                  Gráfico
                </button>
              </div>
            </div>

            {viewMode === 'chart' ? (
              <InstancesStatusChart data={instanceStatusData} loading={statusLoading} />
            ) : (
              <InstancesList instances={instancesList} loading={instancesLoading} />
            )}
          </div>
        </div>

        {/* Costs and Peak Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostsChart data={costData} loading={costsLoading} />
          <PeakHoursChart data={peakHours} loading={peakHoursLoading} />
        </div>

        {/* Response Time and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <ResponseTimeStats stats={responseTimeStats} loading={responseTimeLoading} />
          </div>
          <div className="lg:col-span-2">
            <ActivityFeed activities={activities} loading={activitiesLoading} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;