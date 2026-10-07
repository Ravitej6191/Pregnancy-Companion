import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DashboardPage } from '../pages/DashboardPage'
import { TrackingHubPage } from '../pages/TrackingHubPage'
import { KickCounterPage } from '../pages/KickCounterPage'
// import { ContractionTimerPage } from '../pages/ContractionTimerPage'
import { HealthTrackerPage } from '../pages/HealthTrackerPage'
import { WaterTrackerPage } from '../pages/WaterTrackerPage'
// import { MoodTrackerPage } from '../pages/MoodTrackerPage'
import { JournalPage } from '../pages/JournalPage'
import { JournalFormPage } from '../pages/JournalFormPage'
import { WeeklyGuidePage } from '../pages/WeeklyGuidePage'
import { ChecklistPage } from '../pages/ChecklistPage'
import { DoctorVisitsPage } from '../pages/DoctorVisitsPage'
import { DoctorVisitFormPage } from '../pages/DoctorVisitFormPage'
import { UltrasoundAlbumPage } from '../pages/UltrasoundAlbumPage'
import { RemindersPage } from '../pages/RemindersPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { DailyChecklistPage } from '../pages/DailyChecklistPage'
import { BreathingExercisePage } from '../pages/BreathingExercisePage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { useAppStore } from '../store/useAppStore'

export function AppRouter() {
  const { isOnboarding } = useAppStore()

  if (isOnboarding) {
    return (
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    )
  }

  return (
    <MemoryRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/track" element={<TrackingHubPage />} />
          <Route path="/track/kicks" element={<KickCounterPage />} />
          {/* <Route path="/track/contractions" element={<ContractionTimerPage />} /> */}
          <Route path="/track/health" element={<HealthTrackerPage />} />
          <Route path="/track/water" element={<WaterTrackerPage />} />
          {/* <Route path="/track/mood" element={<MoodTrackerPage />} /> */}
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/journal/new" element={<JournalFormPage />} />
          <Route path="/journal/:id" element={<JournalFormPage />} />
          <Route path="/guide" element={<WeeklyGuidePage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/doctor-visits" element={<DoctorVisitsPage />} />
          <Route path="/doctor-visits/new" element={<DoctorVisitFormPage />} />
          <Route path="/doctor-visits/:id" element={<DoctorVisitFormPage />} />
          <Route path="/ultrasound" element={<UltrasoundAlbumPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/daily-checklist" element={<DailyChecklistPage />} />
          <Route path="/breathing" element={<BreathingExercisePage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}
