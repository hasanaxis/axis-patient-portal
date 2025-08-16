import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { DashboardScreen } from '../screens/main/DashboardScreen'
import { ScansScreen } from '../screens/main/ScansScreen'
import { AppointmentsScreen } from '../screens/main/AppointmentsScreen'
import { ProfileScreen } from '../screens/main/ProfileScreen'
import { ScanViewerScreen } from '../screens/ScanViewerScreen'
import { ReportViewerScreen } from '../screens/main/ReportViewerScreen'
import { BookAppointmentScreen } from '../screens/main/BookAppointmentScreen'
import { SettingsScreen } from '../screens/main/SettingsScreen'
import { ContactScreen } from '../screens/main/ContactScreen'
import { CameraUploadScreen } from '../screens/main/CameraUploadScreen'

export type MainStackParamList = {
  MainTabs: undefined
  ScanViewer: { scanId: string }
  ReportViewer: { reportId: string; scanId?: string }
  BookAppointment: undefined
  Settings: undefined
  Contact: undefined
  CameraUpload: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Scans: undefined
  Appointments: undefined
  Profile: undefined
}

const Stack = createNativeStackNavigator<MainStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline'
              break
            case 'Scans':
              iconName = focused ? 'medical' : 'medical-outline'
              break
            case 'Appointments':
              iconName = focused ? 'calendar' : 'calendar-outline'
              break
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline'
              break
            default:
              iconName = 'help-outline'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#e5e7eb',
          height: 90,
          paddingBottom: 20,
          paddingTop: 10,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Scans" component={ScansScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="ScanViewer" 
        component={ScanViewerScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="ReportViewer" 
        component={ReportViewerScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen 
        name="CameraUpload" 
        component={CameraUploadScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  )
}