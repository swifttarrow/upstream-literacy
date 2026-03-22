'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

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

  const [formData, setFormData] = useState({
    full_name: '',
    professional_role: '',
    bio: '',
    district_id: '',
    problem_ids: [] as string[], // up to 7; first = primary, rest = secondary
  });
  const [problemSearch, setProblemSearch] = useState('');
  const [showProblemDropdown, setShowProblemDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const problemDropdownRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Map<number, HTMLElement>>(new Map());

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

  // Close problem dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (problemDropdownRef.current && !problemDropdownRef.current.contains(e.target as Node)) {
        setShowProblemDropdown(false);
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

  const addProblem = (id: string) => {
    setFormData((prev) => {
      if (prev.problem_ids.includes(id) || prev.problem_ids.length >= 7) return prev;
      return { ...prev, problem_ids: [...prev.problem_ids, id] };
    });
    setProblemSearch('');
    setShowProblemDropdown(false);
    setHighlightedIndex(-1);
  };

  // Filter problems for combobox (exclude already selected)
  const problemSearchLower = problemSearch.trim().toLowerCase();
  const filteredProblems = problems
    .filter(
      (p) =>
        !formData.problem_ids.includes(p.id) &&
        (!problemSearchLower ||
          p.label.toLowerCase().includes(problemSearchLower) ||
          p.category_name.toLowerCase().includes(problemSearchLower))
    )
    .slice(0, 50); // show all for scrolling

  // Scroll highlighted option into view
  useEffect(() => {
    if (!showProblemDropdown || highlightedIndex < 0) return;
    const el = optionRefs.current.get(highlightedIndex);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedIndex, showProblemDropdown]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (filteredProblems.length === 0) return -1;
      return Math.min(prev, filteredProblems.length - 1);
    });
  }, [filteredProblems.length]);

  const handleProblemComboboxKeyDown = (e: React.KeyboardEvent) => {
    if (!showProblemDropdown && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setShowProblemDropdown(true);
      setHighlightedIndex(filteredProblems.length > 0 ? 0 : -1);
      return;
    }
    if (e.key === 'Escape') {
      setShowProblemDropdown(false);
      setHighlightedIndex(-1);
      return;
    }
    if (filteredProblems.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredProblems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredProblems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredProblems[highlightedIndex]) {
          addProblem(filteredProblems[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowProblemDropdown(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }
  };

  const removeProblem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      problem_ids: prev.problem_ids.filter((x) => x !== id),
    }));
  };

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
          <div className="card" ref={problemDropdownRef}>
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
              <>
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={problemSearch}
                    onChange={(e) => {
                      setProblemSearch(e.target.value);
                      setShowProblemDropdown(true);
                    }}
                    onFocus={() => {
                      setShowProblemDropdown(true);
                      setHighlightedIndex(filteredProblems.length > 0 ? 0 : -1);
                    }}
                    onKeyDown={handleProblemComboboxKeyDown}
                    role="combobox"
                    aria-expanded={showProblemDropdown}
                    aria-haspopup="listbox"
                    aria-activedescendant={
                      showProblemDropdown && highlightedIndex >= 0 && filteredProblems[highlightedIndex]
                        ? `problem-option-${highlightedIndex}`
                        : undefined
                    }
                    aria-controls="problem-listbox"
                    id="problem-combobox"
                    className="input-field w-full"
                    placeholder="Search or scroll through problem statements..."
                    autoComplete="off"
                  />
                  {showProblemDropdown && (
                    <ul
                      ref={listboxRef}
                      id="problem-listbox"
                      role="listbox"
                      aria-labelledby="problem-combobox"
                      className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                    >
                      {filteredProblems.length === 0 ? (
                        <li
                          role="option"
                          className="px-4 py-3 text-sm text-gray-500"
                          aria-disabled
                        >
                          {problemSearch.trim()
                            ? 'No matching problem statements'
                            : 'All selected or no options available'}
                        </li>
                      ) : (
                        filteredProblems.map((p, idx) => (
                          <li
                            key={p.id}
                            id={`problem-option-${idx}`}
                            role="option"
                            ref={(el) => {
                              if (el) optionRefs.current.set(idx, el);
                            }}
                            aria-selected={highlightedIndex === idx}
                            className={`w-full px-4 py-2 text-left text-sm first:rounded-t-lg last:rounded-b-lg cursor-pointer ${
                              highlightedIndex === idx ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              addProblem(p.id);
                            }}
                          >
                            <span className="font-medium text-gray-900">{p.label}</span>
                            <span className="ml-2 text-xs text-gray-500">({p.category_name})</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                {formData.problem_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.problem_ids.map((id, idx) => {
                      const p = problems.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-800"
                        >
                          {idx === 0 && (
                            <span className="text-xs text-gray-500 font-medium">Primary:</span>
                          )}
                          {p.label}
                          <button
                            type="button"
                            onClick={() => removeProblem(id)}
                            className="text-gray-400 hover:text-gray-600"
                            aria-label={`Remove ${p.label}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {formData.problem_ids.length >= 7 && (
                  <p className="text-xs text-gray-500 mt-2">Maximum of 7 problem statements selected.</p>
                )}
              </>
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
