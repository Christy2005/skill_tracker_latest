import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import './App.css';

const ToastContext = createContext(() => {});
const useToast = () => useContext(ToastContext);
const categories = ['PROGRAMMING', 'DATABASE', 'WEB', 'DEVOPS', 'AI', 'SOFT_SKILLS'];
const categoryNames = {
  PROGRAMMING: 'Programming', DATABASE: 'Database', WEB: 'Web development',
  DEVOPS: 'DevOps', AI: 'AI & machine learning', SOFT_SKILLS: 'Soft skills',
};
const chartColors = ['#7a63f5', '#34b89a', '#f4a855', '#eb7190', '#58a8d7', '#a881d5'];
const titleCase = (value = '') => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const errorMessage = (error) => error.response?.data?.message || 'Something went wrong. Please try again.';
const initials = (name = '') => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const dateLabel = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const notify = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3600);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && <div className={`toast toast-${toast.kind}`} role="status">{toast.kind === 'success' ? '✓' : '!'}&nbsp; {toast.message}</div>}
    </ToastContext.Provider>
  );
}

function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingPage />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function LoadingPage() {
  return <div className="loading-screen"><span className="spinner" /> Loading SkillTrack</div>;
}

function LoadingInline() {
  return <div className="loading-inline"><span className="spinner" /> Loading your data…</div>;
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-mark">s</span>
      <span>skilltrack<span className="brand-period">.</span></span>
    </div>
  );
}

function AuthPage({ register = false }) {
  const navigate = useNavigate();
  const notify = useToast();
  const { acceptSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', departmentCode: 'CSE',role:'STUDENT' });
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post(register ? '/auth/register' : '/auth/login', register
        ? form
        : { email: form.email, password: form.password });
      acceptSession(data);
      notify(register ? 'Your account is ready. Welcome to SkillTrack!' : 'Welcome back!');
      navigate('/dashboard');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="auth-art-top"><Brand /></div>
        <div className="auth-message">
          <div className="eyebrow eyebrow-light"><span className="pulse-dot" /> YOUR GROWTH, IN FOCUS</div>
          <h1>Build skills.<br /><span>Show what</span><br />you can do.</h1>
          <p>One place to document your progress, share your work, and get the feedback that moves you forward.</p>
        </div>
        <div className="auth-art-footer"><span>Designed for your next step.</span><span>✳</span></div>
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-mobile-brand"><Brand /></div>
          <div className="eyebrow">SKILLTRACK PORTAL</div>
          <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subtitle">{register ? 'Start building a record of what you know.' : 'Sign in to pick up where you left off.'}</p>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <form onSubmit={submit}>
            {register && <label>Full name<input autoComplete="name" value={form.name} onChange={update('name')} placeholder="e.g. Alex Morgan" required maxLength={100} /></label>}
            <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={update('email')} placeholder="you@college.edu" required /></label>
            {register&&<label>Role
              <select value={form.role}
        onChange={update('role')}
        required>
             <option value="FACULTY">Faculty</option>
             <option value="STUDENT">Student</option>
           </select>
            </label>}
    
            {register && <label>Department code<input value={form.departmentCode} onChange={update('departmentCode')} placeholder="e.g. CSE" required /></label>}
            <label>Password<input type="password" autoComplete={register ? 'new-password' : 'current-password'} value={form.password} onChange={update('password')} placeholder="At least 6 characters" minLength={6} required /></label>
            <button className="button button-primary button-wide" disabled={busy}>{busy ? <><span className="spinner spinner-small" /> Please wait</> : register ? 'Create student account' : 'Sign in'} <span>→</span></button>
          </form>
          <div className="auth-switch">
            {register ? 'Already have an account?' : 'New to SkillTrack?'}{' '}
            <NavLink to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</NavLink>
          </div>
          
        </div>
        <footer className="auth-footer">© {new Date().getFullYear()} SkillTrack <span>•</span> Learn with intention.</footer>
      </section>
    </main>
  );
}

const navStudent = [
  { to: '/dashboard', icon: '◫', label: 'Overview', end: true },
  { to: '/skills', icon: '▤', label: 'My skills' },
  { to: '/skills/new', icon: '+', label: 'Add a skill' },
];
const navFaculty = [
  { to: '/dashboard', icon: '◫', label: 'Overview', end: true },
  { to: '/reviews', icon: '✓', label: 'Review skills' },
  { to: '/students', icon: '♧', label: 'Students' },
];

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user.role === 'FACULTY' ? navFaculty : navStudent;
  const signOut = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="sidebar-brand"><Brand /></NavLink>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'nav-active' : ''}`}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
              {item.label === 'Review skills' && <span className="nav-count">●</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-spark">✳</span><b>Keep growing</b><p>Small steps add up to something great.</p></div>
          <div className="user-card">
            <div className="avatar">{initials(user.name)}</div>
            <div className="user-info"><b>{user.name}</b><span>{user.role === 'FACULTY' ? 'Faculty' : 'Student'} · {user.department?.code}</span></div>
            <button className="icon-button logout-button" title="Sign out" onClick={signOut}>↗</button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><b>{user.role === 'FACULTY' ? 'Faculty' : 'Student'}</b></div>
          <div className="topbar-right"><span className="online-indicator" /> All changes saved <span className="topbar-divider" /><div className="avatar avatar-small">{initials(user.name)}</div></div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${(status || 'pending').toLowerCase()}`}><span />{titleCase(status || 'PENDING')}</span>;
}

function StatCard({ label, value, note, icon, tone = 'violet' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-${tone}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return <div className="empty-state"><div className="empty-graphic">✳</div><b>{title}</b><p>{text}</p>{action}</div>;
}

function StudentDashboard() {
  const notify = useToast();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/skills/my').then(({ data }) => setSkills(data.skills)).catch((error) => notify(errorMessage(error), 'error')).finally(() => setLoading(false));
  }, [notify]);

  const approved = skills.filter((skill) => skill.status === 'APPROVED').length;
  const pending = skills.filter((skill) => skill.status === 'PENDING').length;
  const rejected = skills.filter((skill) => skill.status === 'REJECTED').length;
  const distribution = categories.map((category) => ({
    name: categoryNames[category], value: skills.filter((skill) => skill.category === category).length,
  })).filter((item) => item.value);
  const recent = skills.slice(0, 5);

  return (
    <>
      <PageHeading eyebrow="YOUR LEARNING SPACE" title="Your overview" description="A clear picture of the skills you’re building." action={<NavLink className="button button-primary" to="/skills/new"><span>＋</span> Add a skill</NavLink>} />
      <div className="welcome-strip"><div className="welcome-icon">✳</div><div><b>Every skill tells a story.</b><p>Keep documenting the work you’re proud of — your progress is worth tracking.</p></div><div className="welcome-decoration">✦</div></div>
      {loading ? <LoadingInline /> : <>
        <div className="stats-grid">
          <StatCard label="Skills submitted" value={skills.length} icon="↗" tone="violet" note="Your growing portfolio" />
          <StatCard label="Approved" value={approved} icon="✓" tone="green" note="Verified by faculty" />
          <StatCard label="In review" value={pending} icon="◷" tone="amber" note="Awaiting feedback" />
          <StatCard label="Needs attention" value={rejected} icon="!" tone="rose" note="Ready to improve" />
        </div>
        <div className="dashboard-grid">
          <section className="panel recent-panel">
            <div className="panel-heading"><div><h2>Recent submissions</h2><p>Your latest skill activity</p></div><NavLink className="text-link" to="/skills">View all <span>→</span></NavLink></div>
            {recent.length ? <div className="skill-list">{recent.map((skill) => <SkillRow key={skill.id} skill={skill} />)}</div> : <EmptyState title="Your story starts here" text="Add a skill to start building your portfolio." action={<NavLink className="button button-outline" to="/skills/new">Add first skill</NavLink>} />}
          </section>
          <section className="panel category-panel">
            <div className="panel-heading"><div><h2>Skill categories</h2><p>Where you’re investing your time</p></div><span className="panel-menu">•••</span></div>
            {distribution.length ? <div className="chart-wrap pie-wrap"><ResponsiveContainer width="100%" height={185}><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={78} paddingAngle={4} stroke="none">{distribution.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pie-center"><b>{skills.length}</b><span>skills</span></div></div> : <EmptyState title="No categories yet" text="Add skills to see your focus areas." />}
            <div className="legend-list">{distribution.map((item, index) => <div key={item.name}><span style={{ background: chartColors[index % chartColors.length] }} />{item.name}<b>{item.value}</b></div>)}</div>
          </section>
        </div>
        <section className="panel feedback-panel">
          <div className="panel-heading"><div><h2>Latest faculty feedback</h2><p>Suggestions to help you keep improving</p></div></div>
          {skills.flatMap((skill) => (skill.reviews || []).map((review) => ({ ...review, skillName: skill.skillName }))).slice(0, 3).length
            ? <div className="feedback-list">{skills.flatMap((skill) => (skill.reviews || []).map((review) => ({ ...review, skillName: skill.skillName }))).slice(0, 3).map((review) => <div className="feedback-item" key={review.id}><span className="feedback-mark">“</span><div><b>{review.skillName}</b><p>{review.comments || 'Your skill was approved.'}</p><small>{review.faculty?.name || 'Faculty'} · {dateLabel(review.reviewedAt)}</small></div><StatusBadge status={review.status} /></div>)}</div>
            : <p className="muted-copy">Feedback from your faculty reviews will appear here.</p>}
        </section>
      </>}
    </>
  );
}

function SkillRow({ skill, actions = false, onReview }) {
  return (
    <div className="skill-row">
      <div className="skill-symbol">{skill.skillName?.slice(0, 1).toUpperCase()}</div>
      <div className="skill-row-main"><b>{skill.skillName}</b><span>{categoryNames[skill.category] || titleCase(skill.category)} <i>·</i> {titleCase(skill.proficiency)}</span></div>
      {skill.student && <div className="skill-owner">{skill.student.name}</div>}
      <StatusBadge status={skill.status} />
      <div className="skill-date">{dateLabel(skill.updatedAt || skill.createdAt)}</div>
      {actions && skill.status === 'PENDING' && <button className="button button-small button-outline" onClick={() => onReview(skill)}>Review <span>→</span></button>}
      {!actions && <NavLink className="row-arrow" to={`/skills/${skill.id}`} aria-label={`View ${skill.skillName}`}>↗</NavLink>}
    </div>
  );
}

function MySkillsPage() {
  const notify = useToast();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  useEffect(() => {
    api.get('/skills/my').then(({ data }) => setSkills(data.skills)).catch((error) => notify(errorMessage(error), 'error')).finally(() => setLoading(false));
  }, [notify]);
  const filtered = skills.filter((skill) => (filter === 'ALL' || skill.status === filter) && skill.skillName.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="YOUR PORTFOLIO" title="My skills" description="Everything you’ve submitted, all in one place." action={<NavLink className="button button-primary" to="/skills/new"><span>＋</span> Add a skill</NavLink>} />
      <div className="filter-toolbar">
        <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skills..." /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by status"><option value="ALL">All statuses</option><option value="PENDING">In review</option><option value="APPROVED">Approved</option><option value="REJECTED">Needs attention</option></select>
        <span className="results-count">{filtered.length} {filtered.length === 1 ? 'skill' : 'skills'}</span>
      </div>
      <section className="panel table-panel">
        <div className="table-head"><span>SKILL</span><span>CATEGORY</span><span>LEVEL</span><span>STATUS</span><span>UPDATED</span><span /></div>
        {loading ? <LoadingInline /> : filtered.length ? filtered.map((skill) => <div className="table-row" key={skill.id}>
          <NavLink className="table-skill" to={`/skills/${skill.id}`}><span className="skill-symbol">{skill.skillName.slice(0, 1).toUpperCase()}</span><b>{skill.skillName}</b></NavLink>
          <span>{categoryNames[skill.category]}</span><span>{titleCase(skill.proficiency)}</span><StatusBadge status={skill.status} /><span className="table-date">{dateLabel(skill.updatedAt)}</span>
          {skill.status === 'REJECTED' ? <NavLink className="text-link" to={`/skills/${skill.id}/edit`}>Resubmit →</NavLink> : <NavLink className="row-arrow" to={`/skills/${skill.id}`} aria-label="View skill">↗</NavLink>}
        </div>) : <EmptyState title="No skills found" text={query || filter !== 'ALL' ? 'Try adjusting your filters.' : 'Add your first skill to get started.'} action={!skills.length && <NavLink className="button button-outline" to="/skills/new">Add a skill</NavLink>} />}
      </section>
    </>
  );
}

function SkillFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [form, setForm] = useState({ skillName: '', category: 'PROGRAMMING', proficiency: 'BEGINNER', description: '', evidenceUrl: '' });
  useEffect(() => {
    if (!id) return;
    api.get(`/skills/${id}`).then(({ data }) => setForm({
      skillName: data.skill.skillName, category: data.skill.category, proficiency: data.skill.proficiency,
      description: data.skill.description, evidenceUrl: data.skill.evidenceUrl || '',
    })).catch((requestError) => setError(errorMessage(requestError))).finally(() => setLoading(false));
  }, [id, notify]);
  const update = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (id) await api.put(`/skills/${id}`, form);
      else await api.post('/skills', form);
      notify(id ? 'Your skill was resubmitted for review.' : 'Your skill has been submitted.');
      navigate('/skills');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <LoadingInline />;
  return (
    <>
      <PageHeading eyebrow={id ? 'UPDATE SUBMISSION' : 'GROW YOUR PORTFOLIO'} title={id ? 'Resubmit your skill' : 'Add a skill'} description={id ? 'Use the feedback to strengthen your submission.' : 'Tell us what you’ve learned and show your work.'} />
      <div className="form-layout">
        <form className="panel skill-form" onSubmit={submit}>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <label>Skill name <span className="required">*</span><input value={form.skillName} onChange={update('skillName')} placeholder="e.g. React development" maxLength={100} required /></label>
          <div className="form-row">
            <label>Category <span className="required">*</span><select value={form.category} onChange={update('category')}>{categories.map((category) => <option key={category} value={category}>{categoryNames[category]}</option>)}</select></label>
            <label>Proficiency <span className="required">*</span><select value={form.proficiency} onChange={update('proficiency')}><option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option></select></label>
          </div>
          <label>Description <span className="required">*</span><textarea rows="5" maxLength={2000} value={form.description} onChange={update('description')} placeholder="What have you learned? How have you applied this skill?" required /><small className="field-note">{form.description.length}/2,000 characters</small></label>
          <label>Evidence link <span className="optional">(optional)</span><input type="url" value={form.evidenceUrl} onChange={update('evidenceUrl')} placeholder="https://github.com/you/project" /><small className="field-note">Link a project, certificate, or portfolio item.</small></label>
          <div className="form-actions"><NavLink className="button button-quiet" to={id ? `/skills/${id}` : '/skills'}>Cancel</NavLink><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Resubmit for review' : 'Submit skill'} <span>→</span></button></div>
        </form>
        <aside className="form-tip"><div className="tip-icon">✳</div><h3>A little detail goes a long way.</h3><p>Great submissions include a specific example of how you used your skill and a link that helps faculty see your work.</p><div className="tip-example"><span>PRO TIP</span><p>Instead of “I know Python,” try “Built a data-cleaning script that reduced manual processing time by 40%.”</p></div></aside>
      </div>
    </>
  );
}

function SkillDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const notify = useToast();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(`/skills/${id}`).then(({ data }) => setSkill(data.skill)).catch((error) => notify(errorMessage(error), 'error')).finally(() => setLoading(false));
  }, [id, notify]);
  if (loading) return <LoadingInline />;
  if (!skill) return <EmptyState title="Skill not found" text="This submission may have been removed or you may not have access." />;
  return (
    <>
      <PageHeading eyebrow="SKILL DETAILS" title={skill.skillName} description={`${categoryNames[skill.category]} · ${titleCase(skill.proficiency)}`} action={user.role === 'STUDENT' && skill.status === 'REJECTED' && <NavLink className="button button-primary" to={`/skills/${id}/edit`}>Edit & resubmit <span>→</span></NavLink>} />
      <div className="detail-grid">
        <section className="panel detail-main"><div className="detail-meta"><StatusBadge status={skill.status} /><span>Submitted {dateLabel(skill.createdAt)}</span></div><h2>About this skill</h2><p className="detail-description">{skill.description}</p>{skill.evidenceUrl && <a className="evidence-link" href={skill.evidenceUrl} target="_blank" rel="noreferrer"><span>↗</span> View supporting evidence</a>}{skill.student && <div className="student-chip"><div className="avatar avatar-small">{initials(skill.student.name)}</div><span>Submitted by <b>{skill.student.name}</b></span></div>}</section>
        <section className="panel history-panel"><div className="panel-heading"><div><h2>Review history</h2><p>Feedback and status updates</p></div></div>
          {skill.reviews?.length ? <div className="timeline">{skill.reviews.map((review) => <div className="timeline-item" key={review.id}><div className={`timeline-dot timeline-${review.status.toLowerCase()}`} /><div className="timeline-content"><div><b>{titleCase(review.status)}</b><span>{dateLabel(review.reviewedAt)}</span></div><p>{review.comments || 'No written feedback was provided.'}</p><small>{review.faculty?.name || 'Faculty reviewer'}</small></div></div>)}
          {skill.status === 'PENDING' && <div className="timeline-item"><div className="timeline-dot timeline-pending" /><div className="timeline-content"><b>Under review</b><p>Your submission is waiting for faculty feedback.</p></div></div>}</div>
          : <EmptyState title="No reviews yet" text="Faculty feedback will show here once your skill is reviewed." />}
        </section>
      </div>
    </>
  );
}

function FacultyDashboard() {
  const notify = useToast();
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([api.get('/faculty/stats'), api.get('/faculty/submissions')])
      .then(([statsResponse, submissionsResponse]) => {
        setStats(statsResponse.data);
        setSubmissions(submissionsResponse.data.submissions);
      })
      .catch((error) => notify(errorMessage(error), 'error'))
      .finally(() => setLoading(false));
  }, [notify]);
  const categoriesData = (stats?.departmentStats || []).map((item) => ({ name: categoryNames[item.category] || titleCase(item.category), total: item._count._all }));
  const recent = submissions.slice(0, 5);
  return (
    <>
      <PageHeading eyebrow="DEPARTMENT WORKSPACE" title="Faculty overview" description="A snapshot of skills and progress across your department." action={<NavLink className="button button-primary" to="/reviews">Review submissions <span>→</span></NavLink>} />
      {loading ? <LoadingInline /> : <>
        <div className="stats-grid">
          <StatCard label="Department students" value={stats?.totalStudents ?? 0} icon="♧" tone="violet" note="In your department" />
          <StatCard label="Total submissions" value={stats?.totalSkills ?? 0} icon="↗" tone="blue" note="Skills tracked" />
          <StatCard label="Pending review" value={stats?.pendingReviews ?? 0} icon="◷" tone="amber" note="Ready for your feedback" />
          <StatCard label="Approved skills" value={stats?.approvedSkills ?? 0} icon="✓" tone="green" note={`${stats?.rejectedSkills ?? 0} need improvement`} />
        </div>
        <div className="dashboard-grid faculty-dashboard-grid">
          <section className="panel faculty-chart-panel"><div className="panel-heading"><div><h2>Department skill mix</h2><p>Submissions by skill category</p></div><span className="panel-menu">•••</span></div>
            {categoriesData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={250}><BarChart data={categoriesData} margin={{ top: 10, right: 4, left: -20, bottom: 4 }}><CartesianGrid stroke="#f0eef5" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9994a7', fontSize: 10 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#9994a7', fontSize: 11 }} /><Tooltip cursor={{ fill: '#f8f6ff' }} /><Bar dataKey="total" fill="#806cf4" radius={[5, 5, 0, 0]} barSize={28} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No department data yet" text="Category trends appear as students submit skills." />}
          </section>
          <section className="panel pending-panel"><div className="panel-heading"><div><h2>Needs your review</h2><p>Latest student submissions</p></div><NavLink className="text-link" to="/reviews">See all <span>→</span></NavLink></div>
            {recent.filter((skill) => skill.status === 'PENDING').length ? recent.filter((skill) => skill.status === 'PENDING').slice(0, 4).map((skill) => <div className="pending-row" key={skill.id}><div className="avatar avatar-small">{initials(skill.student.name)}</div><div className="pending-info"><b>{skill.skillName}</b><span>{skill.student.name} · {titleCase(skill.proficiency)}</span></div><NavLink className="row-arrow" to={`/reviews/${skill.id}`}>↗</NavLink></div>) : <EmptyState title="All caught up" text="No pending submissions right now." />}
          </section>
        </div>
        <section className="panel student-progress-panel"><div className="panel-heading"><div><h2>Student development</h2><p>Skill progress across your department</p></div><NavLink className="text-link" to="/students">View students <span>→</span></NavLink></div>
          {stats?.studentsOverview?.length ? <div className="progress-list">{stats.studentsOverview.slice(0, 5).map((student) => <div className="progress-row" key={student.id}><div className="avatar avatar-small">{initials(student.name)}</div><b>{student.name}</b><div className="progress-track"><span style={{ width: `${student.totalSkills ? Math.max(8, student.approved / student.totalSkills * 100) : 0}%` }} /></div><span className="progress-count">{student.approved}/{student.totalSkills} approved</span></div>)}</div> : <EmptyState title="No student activity yet" text="Students from your department will appear here." />}
        </section>
      </>}
    </>
  );
}

function FacultyReviewsPage() {
  const notify = useToast();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [query, setQuery] = useState('');
  useEffect(() => {
    api.get('/faculty/submissions').then(({ data }) => setSkills(data.submissions)).catch((error) => notify(errorMessage(error), 'error')).finally(() => setLoading(false));
  }, [notify]);
  const filtered = skills.filter((skill) => (filter === 'ALL' || skill.status === filter) && `${skill.skillName} ${skill.student.name}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="FACULTY REVIEW" title="Skill submissions" description="Review evidence, recognize progress, and offer helpful next steps." />
      <div className="filter-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students or skills..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter submissions"><option value="PENDING">Pending review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="ALL">All statuses</option></select><span className="results-count">{filtered.length} submissions</span></div>
      <section className="panel review-list-panel">
        {loading ? <LoadingInline /> : filtered.length ? filtered.map((skill) => <div className="review-list-row" key={skill.id}><div className="avatar">{initials(skill.student.name)}</div><div className="review-list-main"><NavLink to={`/reviews/${skill.id}`}><b>{skill.skillName}</b></NavLink><span>{skill.student.name} · {categoryNames[skill.category]} · {titleCase(skill.proficiency)}</span></div><StatusBadge status={skill.status} /><span className="table-date">{dateLabel(skill.updatedAt)}</span><NavLink className="button button-small button-outline" to={`/reviews/${skill.id}`}>{skill.status === 'PENDING' ? 'Review' : 'Details'} <span>→</span></NavLink></div>) : <EmptyState title="Nothing to review" text="Try changing the status filter or search terms." />}
      </section>
    </>
  );
}

function FacultyReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const [skill, setSkill] = useState(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get(`/skills/${id}`).then(({ data }) => setSkill(data.skill)).catch((error) => notify(errorMessage(error), 'error')).finally(() => setLoading(false));
  }, [id, notify]);
  const review = async (decision) => {
    const feedback = comments.trim();
    if (!window.confirm(`${decision === 'APPROVED' ? 'Approve' : 'Reject'} this skill submission?`)) return;
    if (decision === 'REJECTED' && !feedback) {
      notify('Please add feedback before rejecting a skill.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/faculty/skills/${id}/review`, { decision, comments: feedback });
      notify(decision === 'APPROVED' ? 'Skill approved.' : 'Skill rejected with feedback.');
      navigate('/reviews');
    } catch (error) {
      notify(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <LoadingInline />;
  if (!skill) return <EmptyState title="Submission not found" text="This skill may have been removed or be outside your department." />;
  return (
    <>
      <PageHeading eyebrow="SUBMISSION REVIEW" title={skill.skillName} description={`Submitted by ${skill.student.name} · ${categoryNames[skill.category]}`} />
      <div className="detail-grid faculty-detail-grid">
        <section className="panel detail-main"><div className="detail-meta"><StatusBadge status={skill.status} /><span>Submitted {dateLabel(skill.createdAt)}</span></div><div className="detail-student"><div className="avatar">{initials(skill.student.name)}</div><div><b>{skill.student.name}</b><span>{skill.student.email}</span></div></div><div className="detail-rule" /><div className="detail-facts"><div><span>Category</span><b>{categoryNames[skill.category]}</b></div><div><span>Proficiency</span><b>{titleCase(skill.proficiency)}</b></div></div><h2>Student description</h2><p className="detail-description">{skill.description}</p>{skill.evidenceUrl && <a className="evidence-link" href={skill.evidenceUrl} target="_blank" rel="noreferrer"><span>↗</span> Open supporting evidence</a>}
          <h2 className="feedback-heading">Your feedback</h2><textarea className="review-feedback" rows="4" maxLength={2000} value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Share what went well and a helpful next step…" disabled={skill.status !== 'PENDING'} /><small className="field-note">Feedback is required if you reject this submission.</small>
          {skill.status === 'PENDING' ? <div className="review-actions"><button className="button button-outline button-reject" disabled={busy} onClick={() => review('REJECTED')}>Request changes</button><button className="button button-primary" disabled={busy} onClick={() => review('APPROVED')}>{busy ? 'Saving…' : 'Approve skill'} <span>✓</span></button></div> : <div className="review-closed-note">This submission has already been reviewed.</div>}
        </section>
        <section className="panel history-panel"><div className="panel-heading"><div><h2>Review history</h2><p>Previous decisions and feedback</p></div></div>{skill.reviews?.length ? <div className="timeline">{skill.reviews.map((reviewItem) => <div className="timeline-item" key={reviewItem.id}><div className={`timeline-dot timeline-${reviewItem.status.toLowerCase()}`} /><div className="timeline-content"><div><b>{titleCase(reviewItem.status)}</b><span>{dateLabel(reviewItem.reviewedAt)}</span></div><p>{reviewItem.comments || 'No written feedback was provided.'}</p><small>{reviewItem.faculty?.name}</small></div></div>)}</div> : <EmptyState title="First review" text="Your decision and feedback will be recorded here." />}</section>
      </div>
    </>
  );
}

function FacultyStudentsPage() {
  const notify = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    api.get('/faculty/students').then(({ data }) => setStudents(data.students)).catch((error) => notify(errorMessage(error), 'error')).finally(() => setLoading(false));
  }, [notify]);
  const filtered = students.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="YOUR DEPARTMENT" title="Students" description="Follow student submissions and skill development." />
      <div className="filter-toolbar"><label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a student..." /></label><span className="results-count">{filtered.length} students</span></div>
      <section className="panel students-table">
        <div className="table-head student-table-head"><span>STUDENT</span><span>SUBMISSIONS</span><span>APPROVED</span><span>IN REVIEW</span><span>NEEDS ATTENTION</span></div>
        {loading ? <LoadingInline /> : filtered.length ? filtered.map((student) => <div className="student-table-row" key={student.id}><div className="student-table-name"><div className="avatar">{initials(student.name)}</div><span><b>{student.name}</b><small>{student.email}</small></span></div><b>{student.skillCount}</b><span className="count-green">{student.approvedCount}</span><span className="count-amber">{student.pendingCount}</span><span className="count-rose">{student.rejectedCount}</span></div>) : <EmptyState title="No students found" text="Students who register in your department will appear here." />}
      </section>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route element={<ProtectedRoute role="STUDENT" />}>
            <Route path="/skills" element={<MySkillsPage />} />
            <Route path="/skills/new" element={<SkillFormPage />} />
            <Route path="/skills/:id" element={<SkillDetailPage />} />
            <Route path="/skills/:id/edit" element={<SkillFormPage />} />
          </Route>
          <Route element={<ProtectedRoute role="FACULTY" />}>
            <Route path="/reviews" element={<FacultyReviewsPage />} />
            <Route path="/reviews/:id" element={<FacultyReviewDetailPage />} />
            <Route path="/students" element={<FacultyStudentsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function DashboardRoute() {
  const { user } = useAuth();
  return user.role === 'FACULTY' ? <FacultyDashboard /> : <StudentDashboard />;
}

function App() {
  return <BrowserRouter><AuthProvider><ToastProvider><AppRoutes /></ToastProvider></AuthProvider></BrowserRouter>;
}

export default App;
