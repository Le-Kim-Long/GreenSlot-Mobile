import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Leaf, ClipboardList, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import HomeScreen from '../screens/home/HomeScreen';
import GardenListScreen from '../screens/gardens/GardenListScreen';
import MyRentalsScreen from '../screens/customer/MyRentalsScreen';
import AccountScreen from '../screens/customer/AccountScreen';
import type { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green[600],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.green[100],
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Gardens"
        component={GardenListScreen}
        options={{
          tabBarLabel: 'Vườn',
          tabBarIcon: ({ color, size }) => <Leaf color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Rentals"
        component={MyRentalsScreen}
        options={{
          tabBarLabel: 'Thuê của tôi',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarLabel: 'Tài khoản',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
