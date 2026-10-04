import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { NovelGenre } from '@/types';
import type {
  TitleCandidate,
  WorldSetting,
  Protagonist,
  CharacterDraft,
  PlotDirection,
  ChapterPlanItem,
  OutlineResult,
  VolumeOutline,
  ArcOutline,
} from '@/api/creation';
import { genreApi } from '@/api/creation';

const STORAGE_KEY = 'novel-wizard-state';

export interface BasicSetting {
  chapterCount: number;
  wordsPerChapter: number;
  targetWordCount: number;
  writingStyle: string;
  pointOfView: string;
  pacing: string;
  targetAudience: string;
  keywords: string[];
}

export interface WizardState {
  currentStep: number;
  genreIds: string[];
  mainGenreId: string;
  subGenreIds: string[];
  titleCandidates: TitleCandidate[];
  selectedTitleIndex: number;
  title: string;
  description: string;
  basicSetting: BasicSetting;
  worldSetting: WorldSetting | null;
  protagonist: Protagonist | null;
  characters: CharacterDraft[];
  coreSetting: Record<string, unknown> | null;
  plotDirection: PlotDirection | null;
  outline: OutlineResult | null;
  outlineContent: string;
  chapterPlan: ChapterPlanItem[];
  novelId: string | null;
  outlinePreview: VolumeOutline | null;
  arcPreview: { volumeNumber: number; arcNumber: number; chapters: ChapterPlanItem[] } | null;
  aiProvider: string;
}

function createDefaultState(): WizardState {
  return {
    currentStep: 1,
    genreIds: [],
    mainGenreId: '',
    subGenreIds: [],
    titleCandidates: [],
    selectedTitleIndex: -1,
    title: '',
    description: '',
    basicSetting: {
      chapterCount: 50,
      wordsPerChapter: 3000,
      targetWordCount: 150000,
      writingStyle: '',
      pointOfView: '第三人称',
      pacing: '中等',
      targetAudience: '男性',
      keywords: [],
    },
    worldSetting: null,
    protagonist: null,
    characters: [],
    coreSetting: null,
    plotDirection: null,
    outline: null,
    outlineContent: '',
    chapterPlan: [],
    novelId: null,
    outlinePreview: null,
    arcPreview: null,
    aiProvider: '',
  };
}

export const useWizardStore = defineStore('wizard', () => {
  const state = ref<WizardState>(loadState());
  const genres = ref<NovelGenre[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const currentStep = computed(() => state.value.currentStep);
  const mainGenre = computed(() => genres.value.find((g) => g.id === state.value.mainGenreId));
  const subGenres = computed(() =>
    genres.value.filter((g) => state.value.subGenreIds.includes(g.id)),
  );
  const selectedTitle = computed(() =>
    state.value.selectedTitleIndex >= 0
      ? state.value.titleCandidates[state.value.selectedTitleIndex]
      : null,
  );
  const totalSteps = computed(() => 13);

  const progress = computed(() => Math.round((state.value.currentStep / totalSteps.value) * 100));

  async function loadGenres() {
    try {
      loading.value = true;
      const res = await genreApi.findAll();
      genres.value = res.data || [];
    } catch (err) {
      error.value = '加载类型失败';
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function setStep(step: number) {
    state.value.currentStep = Math.max(1, Math.min(step, totalSteps.value));
    saveState();
  }

  function nextStep() {
    setStep(state.value.currentStep + 1);
  }

  function prevStep() {
    setStep(state.value.currentStep - 1);
  }

  function setGenreSelection(mainGenreId: string, subGenreIds: string[]) {
    state.value.mainGenreId = mainGenreId;
    state.value.subGenreIds = subGenreIds;
    state.value.genreIds = [mainGenreId, ...subGenreIds];
    saveState();
  }

  function setTitleCandidates(candidates: TitleCandidate[]) {
    state.value.titleCandidates = candidates;
    saveState();
  }

  function selectTitle(index: number) {
    state.value.selectedTitleIndex = index;
    const candidate = candidates(index);
    if (candidate) {
      state.value.title = candidate.title;
      state.value.description = candidate.description;
    }
    saveState();
  }

  function candidates(index: number): TitleCandidate | null {
    return state.value.titleCandidates[index] || null;
  }

  function setTitle(title: string) {
    state.value.title = title;
    saveState();
  }

  function setDescription(description: string) {
    state.value.description = description;
    saveState();
  }

  function setBasicSetting(setting: Partial<BasicSetting>) {
    Object.assign(state.value.basicSetting, setting);
    saveState();
  }

  function setWorldSetting(worldSetting: WorldSetting) {
    state.value.worldSetting = worldSetting;
    saveState();
  }

  function setProtagonist(protagonist: Protagonist) {
    state.value.protagonist = protagonist;
    saveState();
  }

  function setCharacters(characters: CharacterDraft[]) {
    state.value.characters = characters;
    saveState();
  }

  function addCharacter(character: CharacterDraft) {
    state.value.characters.push(character);
    saveState();
  }

  function removeCharacter(index: number) {
    state.value.characters.splice(index, 1);
    saveState();
  }

  function updateCharacter(index: number, character: Partial<CharacterDraft>) {
    Object.assign(state.value.characters[index], character);
    saveState();
  }

  function setCoreSetting(coreSetting: Record<string, unknown>) {
    state.value.coreSetting = coreSetting;
    saveState();
  }

  function setPlotDirection(plotDirection: PlotDirection) {
    state.value.plotDirection = plotDirection;
    saveState();
  }

  function setOutline(outline: OutlineResult) {
    state.value.outline = outline;
    saveState();
  }

  function setOutlinePreview(preview: VolumeOutline | null) {
    state.value.outlinePreview = preview;
    saveState();
  }

  function setArcPreview(
    preview: { volumeNumber: number; arcNumber: number; chapters: ChapterPlanItem[] } | null,
  ) {
    state.value.arcPreview = preview;
    saveState();
  }

  function applyVolumePreview() {
    if (!state.value.outlinePreview || !state.value.outline) return;
    const preview = state.value.outlinePreview;
    const volumeIndex = state.value.outline.volumes.findIndex(
      (v) => v.volumeNumber === preview.volumeNumber,
    );
    if (volumeIndex >= 0) {
      state.value.outline.volumes[volumeIndex] = preview;
    } else {
      state.value.outline.volumes.push(preview);
      state.value.outline.volumes.sort((a, b) => a.volumeNumber - b.volumeNumber);
    }
    state.value.outlinePreview = null;
    saveState();
  }

  function applyArcPreview() {
    if (!state.value.arcPreview || !state.value.outline) return;
    const { volumeNumber, arcNumber, chapters } = state.value.arcPreview;
    const volume = state.value.outline.volumes.find((v) => v.volumeNumber === volumeNumber);
    if (!volume) return;
    const arcIndex = volume.arcs.findIndex((a) => a.arcNumber === arcNumber);
    if (arcIndex >= 0) {
      volume.arcs[arcIndex].chapters = chapters;
    } else {
      volume.arcs.push({ arcNumber, title: `Arc ${arcNumber}`, summary: '', chapters });
      volume.arcs.sort((a, b) => a.arcNumber - b.arcNumber);
    }
    state.value.arcPreview = null;
    saveState();
  }

  function updateVolume(volumeNumber: number, updates: Partial<VolumeOutline>) {
    if (!state.value.outline) return;
    const volume = state.value.outline.volumes.find((v) => v.volumeNumber === volumeNumber);
    if (volume) {
      Object.assign(volume, updates);
      saveState();
    }
  }

  function updateArc(volumeNumber: number, arcNumber: number, updates: Partial<ArcOutline>) {
    if (!state.value.outline) return;
    const volume = state.value.outline.volumes.find((v) => v.volumeNumber === volumeNumber);
    if (!volume) return;
    const arc = volume.arcs.find((a) => a.arcNumber === arcNumber);
    if (arc) {
      Object.assign(arc, updates);
      saveState();
    }
  }

  function removeVolume(volumeNumber: number) {
    if (!state.value.outline) return;
    state.value.outline.volumes = state.value.outline.volumes.filter(
      (v) => v.volumeNumber !== volumeNumber,
    );
    saveState();
  }

  function removeArc(volumeNumber: number, arcNumber: number) {
    if (!state.value.outline) return;
    const volume = state.value.outline.volumes.find((v) => v.volumeNumber === volumeNumber);
    if (!volume) return;
    volume.arcs = volume.arcs.filter((a) => a.arcNumber !== arcNumber);
    saveState();
  }

  function reorderVolumes(fromIndex: number, toIndex: number) {
    if (!state.value.outline) return;
    const volumes = state.value.outline.volumes;
    const [moved] = volumes.splice(fromIndex, 1);
    volumes.splice(toIndex, 0, moved);
    volumes.forEach((v, i) => {
      v.volumeNumber = i + 1;
    });
    saveState();
  }

  function reorderArcs(volumeNumber: number, fromIndex: number, toIndex: number) {
    if (!state.value.outline) return;
    const volume = state.value.outline.volumes.find((v) => v.volumeNumber === volumeNumber);
    if (!volume) return;
    const arcs = volume.arcs;
    const [moved] = arcs.splice(fromIndex, 1);
    arcs.splice(toIndex, 0, moved);
    arcs.forEach((a, i) => {
      a.arcNumber = i + 1;
    });
    saveState();
  }

  function setOutlineContent(content: string) {
    state.value.outlineContent = content;
    saveState();
  }

  function setChapterPlan(chapters: ChapterPlanItem[]) {
    state.value.chapterPlan = chapters;
    saveState();
  }

  function setNovelId(id: string) {
    state.value.novelId = id;
    saveState();
  }

  function setAiProvider(provider: string) {
    state.value.aiProvider = provider;
    saveState();
  }

  function reset() {
    state.value = createDefaultState();
    localStorage.removeItem(STORAGE_KEY);
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value));
  }

  function loadState(): WizardState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...createDefaultState(), ...parsed };
      }
    } catch {
      // ignore
    }
    return createDefaultState();
  }

  return {
    state,
    genres,
    loading,
    error,
    currentStep,
    mainGenre,
    subGenres,
    selectedTitle,
    totalSteps,
    progress,
    loadGenres,
    setStep,
    nextStep,
    prevStep,
    setGenreSelection,
    setTitleCandidates,
    selectTitle,
    setTitle,
    setDescription,
    setBasicSetting,
    setWorldSetting,
    setProtagonist,
    setCharacters,
    addCharacter,
    removeCharacter,
    updateCharacter,
    setCoreSetting,
    setPlotDirection,
    setOutline,
    setOutlinePreview,
    setArcPreview,
    applyVolumePreview,
    applyArcPreview,
    updateVolume,
    updateArc,
    removeVolume,
    removeArc,
    reorderVolumes,
    reorderArcs,
    setOutlineContent,
    setChapterPlan,
    setNovelId,
    setAiProvider,
    reset,
  };
});
