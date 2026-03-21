'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import NavBar from '@/components/NavBar';

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

  const [formData, setFormData] = useState({
    full_name: '',
    professional_role: '',
    bio: '',
    district_id: '',
    primary_problem_id: '',
    secondary_problem_ids: [] as string[],
  });

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
      setFormData({
        full_name: String(user.full_name || ''),
        professional_role: String(user.professional_role || ''),
        bio: String(user.bio || ''),
        district_id: String(user.district_id || ''),
        primary_problem_id: '',
        secondary_problem_ids: [],
      });

      // Set problem selections from user data
      const selections = user.problem_selections as Array<{ problem_statement_id: string; is_primary: boolean }> || [];
      const primary = selections.find((s) => s.is_primary);
      const secondary = selections.filter((s) => !s.is_primary);

      if (primary) {
        setFormData((prev) => ({ ...prev, primary_problem_id: primary.problem_statement_id }));
      }
      if (secondary.length > 0) {
        setFormData((prev) => ({
          ...prev,
          secondary_problem_ids: secondary.map((s) => s.problem_statement_id),
        }));
      }

      setProblems(problemsRes.statements);
      setLoading(false);

      // Load districts
      loadDistricts('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load profile data');
        setLoading(false);
      }
    }
  };

  const loadDistricts = async (search: string) => {
    try {
      const data = await api.get<{ districts: District[] }>(
        `/districts?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`
      );
      setDistricts(data.districts);
    } catch {
      // ignore
    }
  };

  const handleDistrictSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDistrictSearch(e.target.value);
    loadDistricts(e.target.value);
  };

  const toggleSecondary = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      secondary_problem_ids: prev.secondary_problem_ids.includes(id)
        ? prev.secondary_problem_ids.filter((x) => x !== id)
        : [...prev.secondary_problem_ids, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.patch('/users/me', {
        full_name: formData.full_name || undefined,
        professional_role: formData.professional_role || undefined,
        bio: formData.bio || undefined,
        district_id: formData.district_id || undefined,
        primary_problem_id: formData.primary_problem_id || undefined,
        secondary_problem_ids: formData.secondary_problem_ids,
      });

      setSuccess('Profile saved successfully!');
      setTimeout(() => router.push('/discover'), 1000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Group problems by category
  const problemsByCategory = problems.reduce((acc, p) => {
    const cat = p.category_name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, ProblemStatement[]>);

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
            Help us connect you with the right peers. Your district and primary challenge are required.
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
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your district <span className="text-red-500">*</span></h2>
            <div>
              <input
                type="text"
                value={districtSearch}
                onChange={handleDistrictSearch}
                className="input-field mb-3"
                placeholder="Search districts..."
              />
              <select
                value={formData.district_id}
                onChange={(e) => setFormData((p) => ({ ...p, district_id: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select your district</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.state_region ? ` (${d.state_region})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Challenge */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Primary challenge <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              The most important challenge your district is working on right now
            </p>

            {Object.entries(problemsByCategory).map(([category, probs]) => (
              <div key={category} className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {probs.map((p) => (
                    <label key={p.id} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="primary_problem"
                        value={p.id}
                        checked={formData.primary_problem_id === p.id}
                        onChange={() => setFormData((prev) => ({ ...prev, primary_problem_id: p.id }))}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.label}</div>
                        {p.description && (
                          <div className="text-xs text-gray-500">{p.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Secondary Challenges */}
          {problems.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Additional challenges</h2>
              <p className="text-sm text-gray-500 mb-4">Other areas you are working on (optional)</p>

              {Object.entries(problemsByCategory).map(([category, probs]) => (
                <div key={category} className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {probs
                      .filter((p) => p.id !== formData.primary_problem_id)
                      .map((p) => (
                        <label key={p.id} className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            value={p.id}
                            checked={formData.secondary_problem_ids.includes(p.id)}
                            onChange={() => toggleSecondary(p.id)}
                            className="mt-1"
                          />
                          <div className="text-sm text-gray-900">{p.label}</div>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </>
  );
}
