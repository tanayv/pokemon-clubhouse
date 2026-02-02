import { GameScreen } from '../screens/GameScreen';
import { AutotileMapperScreen } from '../screens/tools/AutotileMapperScreen';
import { AutotileTesterScreen } from '../screens/tools/AutotileTesterScreen';
import { GrassAnimationPickerScreen } from '../screens/tools/GrassAnimationPickerScreen';

export type RouteConfig = {
  path: string;
  component: React.ComponentType;
  name: string;
  isDevTool?: boolean;
};

// All application routes
export const routes: RouteConfig[] = [
  // Main game
  {
    path: '/',
    component: GameScreen,
    name: 'Game',
  },

  // Development tools
  {
    path: '/tools/autotile-mapper',
    component: AutotileMapperScreen,
    name: 'Autotile Mapper',
    isDevTool: true,
  },
  {
    path: '/tools/autotile-tester',
    component: AutotileTesterScreen,
    name: 'Autotile Tester',
    isDevTool: true,
  },
  {
    path: '/tools/grass-animation-picker',
    component: GrassAnimationPickerScreen,
    name: 'Grass Animation Picker',
    isDevTool: true,
  },
];

export function AppRouter() {
  const path = window.location.pathname;

  // Find matching route
  const route = routes.find(r => r.path === path) || routes[0];
  const Component = route.component;

  return <Component />;
}

// Helper to navigate to a route
export function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  window.location.href = path; // Force refresh for now
}

// Get all dev tool routes
export function getDevTools(): RouteConfig[] {
  return routes.filter(r => r.isDevTool);
}
