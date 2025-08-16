import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SharingService } from '../../services/SharingService'

interface SharingDashboardProps {
  route: {
    params: {
      patientId: string
    }
  }
  navigation: any
}

interface ShareStatistics {
  totalShares: number
  activeShares: number
  expiredShares: number
  accessCount: number
  mostRecentShare?: any
}

interface RecentActivity {
  id: string
  type: 'SHARE_CREATED' | 'SHARE_ACCESSED' | 'SHARE_REVOKED' | 'EXPORT_CREATED'
  description: string
  timestamp: Date
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  metadata?: any
}

export const SharingDashboardScreen: React.FC<SharingDashboardProps> = ({ route, navigation }) => {
  const { patientId } = route.params
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statistics, setStatistics] = useState<ShareStatistics>({
    totalShares: 0,
    activeShares: 0,
    expiredShares: 0,
    accessCount: 0
  })
  const [recentShares, setRecentShares] = useState<any[]>([])
  const [recentExports, setRecentExports] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load all dashboard data in parallel
      const [stats, shares, exports, consents] = await Promise.all([
        SharingService.getShareStatistics(patientId),
        SharingService.getPatientShares(patientId),
        SharingService.getPatientExports(patientId),
        SharingService.getPatientConsents(patientId)
      ])

      setStatistics(stats)
      setRecentShares(shares.slice(0, 5)) // Show only recent 5
      setRecentExports(exports.slice(0, 5)) // Show only recent 5
      
      // Generate recent activity from shares and exports
      const activity = generateRecentActivity(shares, exports)
      setRecentActivity(activity.slice(0, 10)) // Show only recent 10
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const generateRecentActivity = (shares: any[], exports: any[]): RecentActivity[] => {
    const activities: RecentActivity[] = []

    // Add share activities
    shares.forEach(share => {
      activities.push({
        id: `share-${share.id}`,
        type: 'SHARE_CREATED',
        description: `Shared with ${share.recipientName}`,
        timestamp: new Date(share.createdAt),
        severity: 'LOW',
        metadata: { shareType: share.shareType, recipientEmail: share.recipientEmail }
      })

      if (share.lastAccessedAt) {
        activities.push({
          id: `access-${share.id}`,
          type: 'SHARE_ACCESSED',
          description: `Accessed by ${share.recipientName}`,
          timestamp: new Date(share.lastAccessedAt),
          severity: 'LOW',
          metadata: { shareType: share.shareType }
        })
      }

      if (share.isRevoked) {
        activities.push({
          id: `revoke-${share.id}`,
          type: 'SHARE_REVOKED',
          description: `Share revoked for ${share.recipientName}`,
          timestamp: new Date(share.revokedAt),
          severity: 'MEDIUM',
          metadata: { reason: share.revokeReason }
        })
      }
    })

    // Add export activities
    exports.forEach(exp => {
      activities.push({
        id: `export-${exp.id}`,
        type: 'EXPORT_CREATED',
        description: `${exp.format} export created`,
        timestamp: new Date(exp.createdAt),
        severity: 'LOW',
        metadata: { format: exp.format, purpose: exp.purpose }
      })
    })

    // Sort by timestamp (most recent first)
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  const navigateToShares = () => {
    navigation.navigate('SharesList', { patientId })
  }

  const navigateToExports = () => {
    navigation.navigate('ExportsList', { patientId })
  }

  const navigateToConsents = () => {
    navigation.navigate('ConsentManagement', { patientId })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SHARE_CREATED':
        return 'share'
      case 'SHARE_ACCESSED':
        return 'eye'
      case 'SHARE_REVOKED':
        return 'ban'
      case 'EXPORT_CREATED':
        return 'download'
      default:
        return 'information-circle'
    }
  }

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return '#dc2626'
      case 'MEDIUM':
        return '#d97706'
      default:
        return '#059669'
    }
  }

  const renderStatisticsCard = () => (
    <View style={styles.statisticsCard}>
      <Text style={styles.cardTitle}>Sharing Overview</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{statistics.totalShares}</Text>
          <Text style={styles.statLabel}>Total Shares</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#059669' }]}>{statistics.activeShares}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#d97706' }]}>{statistics.expiredShares}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#2563eb' }]}>{statistics.accessCount}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
      </View>

      {statistics.mostRecentShare && (
        <View style={styles.recentShareInfo}>
          <Text style={styles.recentShareLabel}>Most Recent Share:</Text>
          <Text style={styles.recentShareText}>
            {statistics.mostRecentShare.recipientName} • {new Date(statistics.mostRecentShare.createdAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </View>
  )

  const renderQuickActions = () => (
    <View style={styles.quickActionsCard}>
      <Text style={styles.cardTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionButton} onPress={navigateToShares}>
          <Ionicons name="share" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Manage Shares</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={navigateToExports}>
          <Ionicons name="download" size={24} color="#2563eb" />
          <Text style={styles.actionText}>View Exports</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={navigateToConsents}>
          <Ionicons name="shield-checkmark" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Privacy Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => navigation.navigate('SharingHelp')}
        >
          <Ionicons name="help-circle" size={24} color="#2563eb" />
          <Text style={styles.actionText}>Help & Info</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderRecentShares = () => (
    <View style={styles.recentCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Recent Shares</Text>
        <TouchableOpacity onPress={navigateToShares}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {recentShares.length === 0 ? (
        <Text style={styles.emptyText}>No shares yet</Text>
      ) : (
        recentShares.map((share) => (
          <View key={share.id} style={styles.shareItem}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareName}>{share.recipientName}</Text>
              <View style={[styles.statusBadge, { 
                backgroundColor: share.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2' 
              }]}>
                <Text style={[styles.statusText, { 
                  color: share.status === 'ACTIVE' ? '#059669' : '#dc2626' 
                }]}>
                  {share.status}
                </Text>
              </View>
            </View>
            <Text style={styles.shareDetails}>
              {share.shareType} • Created {new Date(share.createdAt).toLocaleDateString()}
            </Text>
            {share.lastAccessedAt && (
              <Text style={styles.accessInfo}>
                Last accessed: {new Date(share.lastAccessedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        ))
      )}
    </View>
  )

  const renderRecentActivity = () => (
    <View style={styles.recentCard}>
      <Text style={styles.cardTitle}>Recent Activity</Text>
      
      {recentActivity.length === 0 ? (
        <Text style={styles.emptyText}>No recent activity</Text>
      ) : (
        recentActivity.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons 
                name={getActivityIcon(activity.type) as any} 
                size={16} 
                color={getActivityColor(activity.severity)} 
              />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityDescription}>{activity.description}</Text>
              <Text style={styles.activityTime}>
                {activity.timestamp.toLocaleDateString()} at {activity.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Sharing Dashboard</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStatisticsCard()}
        {renderQuickActions()}
        {renderRecentShares()}
        {renderRecentActivity()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  statisticsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  recentShareInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  recentShareLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  recentShareText: {
    fontSize: 14,
    color: '#374151',
  },
  quickActionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },
  recentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  shareItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shareName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  shareDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  accessInfo: {
    fontSize: 12,
    color: '#059669',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  bottomSpacing: {
    height: 20,
  },
})