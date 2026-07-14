import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, useApp } from './context/AppContext';
import { DishSheet } from './components/DishSheet';
import { LandingScreen } from './screens/LandingScreen';
import { CameraScreen } from './screens/CameraScreen';
import { ProcessingScreen } from './screens/ProcessingScreen';
import { MenuScreen } from './screens/MenuScreen';
import { EditScreen } from './screens/EditScreen';
import { ErrorScreen } from './screens/ErrorScreen';

function CurrentScreen() {
  const { screen } = useApp();
  switch (screen) {
    case 'landing':
      return <LandingScreen />;
    case 'camera':
      return <CameraScreen />;
    case 'processing':
      return <ProcessingScreen />;
    case 'menu':
      return <MenuScreen />;
    case 'edit':
      return <EditScreen />;
    case 'error':
      return <ErrorScreen />;
    default:
      return <LandingScreen />;
  }
}

function PhoneFrame() {
  const { screen } = useApp();
  return (
    <div
      className="flex items-center justify-center min-h-[100dvh] bg-[#100E0D] sm:p-6 md:p-10"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="relative w-full sm:max-w-[390px] h-[100dvh] sm:h-[844px]
          sm:max-h-[calc(100dvh_-_3rem)] md:max-h-[calc(100dvh_-_5rem)]
          bg-[#FAF8F5] overflow-hidden sm:rounded-[44px]
          sm:shadow-[0_50px_120px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.07)]"
      >
        <div className="hidden sm:block absolute top-3.5 left-1/2 -translate-x-1/2 z-[60] w-28 h-8 bg-[#100E0D] rounded-full" />

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            <CurrentScreen />
          </motion.div>
        </AnimatePresence>

        {/* Bottom sheet (overlays every screen) */}
        <DishSheet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PhoneFrame />
    </AppProvider>
  );
}
