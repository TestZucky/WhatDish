import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  Dish,
  ErrorType,
  MenuView,
  RestaurantMenu,
  Screen,
} from '../types';
import { MOCK_MENU, CATEGORIES } from '../data/menu';
import { regeneratePronunciation, type PronunciationResult } from '../lib/api';

interface AppState {
  // Navigation
  screen: Screen;
  setScreen: (s: Screen) => void;
  goBack: () => void;
  showError: (type: ErrorType) => void;
  errorType: ErrorType;

  // Menu data (populated by the scan flow, mock by default)
  menu: RestaurantMenu;
  setMenu: (m: RestaurantMenu) => void;
  menuView: MenuView;
  setMenuView: (v: MenuView) => void;

  // List view filters
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  categories: string[];
  filteredDishes: Dish[];
  expandedDish: number | null;
  setExpandedDish: (id: number | null) => void;

  // Camera
  flashOn: boolean;
  setFlashOn: (v: boolean) => void;
  cameraPreview: boolean;
  setCameraPreview: (v: boolean) => void;
  /** The captured/uploaded menu image, sent to the backend scan endpoint. */
  scanImage: Blob | null;
  setScanImage: (b: Blob | null) => void;

  // Dish detail sheet
  selectedDish: Dish | null;
  sheetOpen: boolean;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  openDish: (dish: Dish) => void;
  closeSheet: () => void;

  // Edit / regenerate
  editText: string;
  setEditText: (v: string) => void;
  editRegenerating: boolean;
  editRegenerated: boolean;
  setEditRegenerated: (v: boolean) => void;
  regenResult: PronunciationResult | null;
  goToEdit: () => void;
  handleRegenerate: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>('landing');
  const [errorType, setErrorType] = useState<ErrorType>('blurry');
  const [menu, setMenu] = useState<RestaurantMenu>(MOCK_MENU);
  const [menuView, setMenuView] = useState<MenuView>('image');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedDish, setExpandedDish] = useState<number | null>(null);

  const [flashOn, setFlashOn] = useState(false);
  const [cameraPreview, setCameraPreview] = useState(false);
  const [scanImage, setScanImage] = useState<Blob | null>(null);

  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [editText, setEditText] = useState('');
  const [editRegenerated, setEditRegenerated] = useState(false);
  const [editRegenerating, setEditRegenerating] = useState(false);
  const [regenResult, setRegenResult] = useState<PronunciationResult | null>(
    null,
  );

  const filteredDishes = useMemo(
    () =>
      menu.dishes.filter((d) => {
        const matchesSearch = d.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesCat =
          activeCategory === 'All' || d.category === activeCategory;
        return matchesSearch && matchesCat;
      }),
    [menu.dishes, searchQuery, activeCategory],
  );

  const openDish = (dish: Dish) => {
    setSelectedDish(dish);
    setIsPlaying(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setIsPlaying(false);
  };

  const showError = (type: ErrorType) => {
    setErrorType(type);
    setScreen('error');
  };

  const goToEdit = () => {
    if (!selectedDish) return;
    setEditText(selectedDish.name);
    setEditRegenerated(false);
    setEditRegenerating(false);
    setRegenResult(null);
    setSheetOpen(false);
    setScreen('edit');
  };

  const handleRegenerate = () => {
    if (!editText.trim()) return;
    setEditRegenerating(true);
    setEditRegenerated(false);
    regeneratePronunciation(editText)
      .then((result) => {
        setRegenResult(result);
        setEditRegenerated(true);
      })
      .catch(() => showError('audio'))
      .finally(() => setEditRegenerating(false));
  };

  const goBack = () => {
    if (screen === 'camera') {
      setCameraPreview(false);
      setScreen('landing');
    } else if (screen === 'edit') {
      setScreen('menu');
      setSheetOpen(!!selectedDish);
    } else {
      setScreen('landing');
    }
  };

  const value: AppState = {
    screen,
    setScreen,
    goBack,
    showError,
    errorType,
    menu,
    setMenu,
    menuView,
    setMenuView,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    categories: CATEGORIES,
    filteredDishes,
    expandedDish,
    setExpandedDish,
    flashOn,
    setFlashOn,
    cameraPreview,
    setCameraPreview,
    scanImage,
    setScanImage,
    selectedDish,
    sheetOpen,
    isPlaying,
    setIsPlaying,
    openDish,
    closeSheet,
    editText,
    setEditText,
    editRegenerating,
    editRegenerated,
    setEditRegenerated,
    regenResult,
    goToEdit,
    handleRegenerate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
