'use client';

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';

interface District {
  id: string;
  name: string;
  state_region: string | null;
  city: string | null;
}

interface ProblemStatement {
  id: string;
  code: string;
  label: string;
  description: string | null;
  category_name: string;
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [districts, setDistricts] = useState<District[]>([]);
  const [problems, setProblems] = useState<ProblemStatement[]>([]);
  const [districtSearch, setDistrictSearch] = useState('');
  const [districtSearching, setDistrictSearching] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    full_name: '',
    professional_role: '',
    bio: '',
    district_id: '',
    problem_ids: [] as string[], // up to 7; first = primary, rest = secondary
  });
  const problemComboboxAnchor = useComboboxAnchor();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const [userRes, problemsRes] = await Promise.all([
        api.get<{ user: Record<string, unknown> }>('/users/me'),
        api.get<{ statements: ProblemStatement[] }>('/problem-statements'),
      ]);

      const user = userRes.user;
      const selections = user.problem_selections as Array<{ problem_statement_id: string; is_primary: boolean }> || [];
      const primary = selections.find((s) => s.is_primary);
      const secondary = selections.filter((s) => !s.is_primary);
      const problemIds = primary
        ? [primary.problem_statement_id, ...secondary.map((s) => s.problem_statement_id)]
        : secondary.map((s) => s.problem_statement_id);

      setEmail(String(user.email || ''));
      setFormData({
        full_name: String(user.full_name || ''),
        professional_role: String(user.professional_role || ''),
        bio: String(user.bio || ''),
        district_id: String(user.district_id || ''),
        problem_ids: problemIds,
      });

      setProblems(problemsRes.statements);
      setLoading(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load profile data');
        setLoading(false);
      }
    }
  };

  const loadDistricts = useCallback(async (search: string) => {
    if (!search.trim()) {
      setDistricts([]);
      return;
    }
    setDistrictSearching(true);
    try {
      const data = await api.get<{ districts: District[] }>(
        `/districts?limit=50&search=${encodeURIComponent(search.trim())}`
      );
      setDistricts(data.districts);
    } catch {
      setDistricts([]);
    } finally {
      setDistrictSearching(false);
    }
  }, []);

  // Debounced district search
  useEffect(() => {
    if (!districtSearch.trim()) {
      setDistricts([]);
      setShowRecommendations(false);
      return;
    }
    const t = setTimeout(() => {
      loadDistricts(districtSearch);
      setShowRecommendations(true);
    }, 300);
    return () => clearTimeout(t);
  }, [districtSearch, loadDistricts]);

  // Close recommendations when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (recommendationsRef.current && !recommendationsRef.current.contains(e.target as Node)) {
        setShowRecommendations(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectDistrict = (d: District) => {
    const displayName = `${d.name}${d.state_region ? ` (${d.state_region})` : ''}`;
    setFormData((p) => ({ ...p, district_id: d.id }));
    setDistrictSearch(displayName);
    setShowRecommendations(false);
    setDistricts([]);
  };

  const clearDistrict = () => {
    setFormData((p) => ({ ...p, district_id: '' }));
    setDistrictSearch('');
    setShowRecommendations(false);
    setDistricts([]);
  };

  // Group problems by category for combobox
  const problemGroups = useMemo(() => {
    const byCategory = new Map<string, ProblemStatement[]>();
    for (const p of problems) {
      const list = byCategory.get(p.category_name) || [];
      list.push(p);
      byCategory.set(p.category_name, list);
    }
    const order = Array.from(new Set(problems.map((p) => p.category_name)));
    return order.map((cat) => ({
      value: cat,
      items: byCategory.get(cat) ?? [],
    }));
  }, [problems]);

  const selectedProblems = useMemo(
    () =>
      formData.problem_ids
        .map((id) => problems.find((p) => p.id === id))
        .filter((p): p is ProblemStatement => !!p),
    [formData.problem_ids, problems]
  );

  const handleProblemValueChange = useCallback((value: ProblemStatement[]) => {
    const capped = value.slice(0, 7);
    setFormData((prev) => ({
      ...prev,
      problem_ids: capped.map((p) => p.id),
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.district_id) {
      setError('Please select your district');
      return;
    }
    if (formData.problem_ids.length === 0) {
      setError('Please select at least one problem statement');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    const [primaryId, ...secondaryIds] = formData.problem_ids;
    try {
      await api.patch('/users/me', {
        full_name: formData.full_name || undefined,
        professional_role: formData.professional_role || undefined,
        bio: formData.bio || undefined,
        district_id: formData.district_id || undefined,
        primary_problem_id: primaryId,
        secondary_problem_ids: secondaryIds,
      });

      setSuccess('Profile saved successfully!');
      setTimeout(() => router.push('/discover'), 1000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
          <p className="text-gray-600 mt-1">
            Help us connect you with the right peers. Your district and at least one problem statement are required.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="input-field bg-gray-50 text-gray-600 cursor-not-allowed"
                  aria-describedby="email-help"
                />
                <p id="email-help" className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                  className="input-field"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Professional role</label>
                <input
                  type="text"
                  value={formData.professional_role}
                  onChange={(e) => setFormData((p) => ({ ...p, professional_role: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. Superintendent, Curriculum Director"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                  className="input-field h-24 resize-none"
                  placeholder="Tell peers about your experience and focus areas..."
                />
              </div>
            </div>
          </div>

          {/* District */}
          <div className="card" ref={recommendationsRef}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your district <span className="text-red-500">*</span></h2>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  onFocus={() => districtSearch && setShowRecommendations(true)}
                  className="input-field flex-1"
                  placeholder="Search districts..."
                  autoComplete="off"
                />
                {formData.district_id && (
                  <button
                    type="button"
                    onClick={clearDistrict}
                    className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
                    aria-label="Clear district"
                  >
                    Clear
                  </button>
                )}
              </div>
              {districtSearching && (
                <div className="absolute top-full left-0 right-0 mt-1 py-2 text-sm text-gray-500 text-center">
                  Searching...
                </div>
              )}
              {showRecommendations && !districtSearching && districts.length > 0 && (
                <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {districts.map((d) => {
                    const displayName = `${d.name}${d.state_region ? ` (${d.state_region})` : ''}`;
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => selectDistrict(d)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {displayName}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {showRecommendations && !districtSearching && districtSearch.trim() && districts.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 py-3 px-4 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-lg">
                  No districts found
                </div>
              )}
              <input type="hidden" name="district_id" value={formData.district_id} />
            </div>
          </div>

          {/* Problem Statements */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Problem statements <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Search and select up to 7 challenges your district is working on. The first selection is your primary focus.
            </p>

            {problems.length === 0 ? (
              <p className="text-sm text-amber-600 py-2">
                No problem statements are available yet. Your administrator may need to run the seed.
              </p>
            ) : (
              <Combobox
                items={problemGroups}
                multiple
                autoHighlight
                value={selectedProblems}
                onValueChange={handleProblemValueChange}
                itemToStringValue={(p: ProblemStatement) => p.label}
              >
                <div ref={problemComboboxAnchor} className="w-full rounded-lg border border-input min-h-10 flex flex-col">
                  <ComboboxChips className="w-full !border-0 !min-h-0 !p-2 flex-col items-stretch">
                    <ComboboxValue>
                      {(values: ProblemStatement[]) => (
                        <>
                          <ComboboxChipsInput placeholder="Search problem statements..." className="w-full shrink-0 !min-w-0" />
                          <div className="flex flex-wrap gap-1 w-full min-w-0">
                            {values.map((p, idx) => (
                              <ComboboxChip key={p.id}>
                                {idx === 0 && (
                                  <span className="text-muted-foreground font-medium mr-1">Primary:</span>
                                )}
                                {p.label}
                              </ComboboxChip>
                            ))}
                          </div>
                        </>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                </div>
                <ComboboxContent anchor={problemComboboxAnchor}>
                  <ComboboxEmpty>No problem statements found.</ComboboxEmpty>
                  <ComboboxList className="max-h-[250px]">
                    {(group: { value: string; items: ProblemStatement[] }, index: number) => (
                      <ComboboxGroup key={group.value} items={group.items}>
                        <ComboboxLabel>{group.value}</ComboboxLabel>
                        <ComboboxCollection>
                          {(item: ProblemStatement) => (
                            <ComboboxItem key={item.id} value={item}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxCollection>
                        {index < problemGroups.length - 1 && <ComboboxSeparator />}
                      </ComboboxGroup>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
            {formData.problem_ids.length >= 7 && (
              <p className="text-xs text-muted-foreground mt-2">Maximum of 7 problem statements selected.</p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </>
  );
}
