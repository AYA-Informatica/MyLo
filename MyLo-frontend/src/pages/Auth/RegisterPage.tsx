import { useState } from 'react';
import Button from '../../components/Button';
import InPuts from '../../components/InPuts';
import { useNavigate } from 'react-router-dom';
import logoA from '../../assets/logoA.jpg';
import {
  useRegisterMutation,
  useRegisterFirmMutation,
  useRegisterOrganizationMutation,
} from '../../app/api/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RegisterPage() {
  const [role, setRole] = useState('');
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    address: '',
    // lawDomain: '',
    registrationNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [register] = useRegisterMutation();
  const [registerFirm] = useRegisterFirmMutation();
  const [registerOrganization] = useRegisterOrganizationMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const newErrors: { [key: string]: string } = {};

    if (!role) newErrors.role = 'Please select a registration type';

    if (role === 'firms' || role === 'organization') {
      if (!form.username) newErrors.username = 'Name is required';
      if (!form.email) newErrors.email = 'Email is required';
      if (!form.address) newErrors.address = 'Address is required';
      if (!form.registrationNumber)
        newErrors.registrationNumber = 'Registration Number is required';
    } else {
      if (!form.username) newErrors.username = 'Username is required';
      if (!form.email) newErrors.email = 'Email is required';
    }

    if (!form.password) newErrors.password = 'Password is required';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      let payload: any;
      if (role === 'firms' || role === 'organization') {
        payload = {
          name: form.username, // use 'name' for firm/organization
          email: form.email,
          address: form.address,
          registrationNumber: form.registrationNumber,
          password: form.password,
        };
      } else {
        payload = {
          username: form.username,
          email: form.email,
          password: form.password,
        };
      }
      try {
        if (role === 'users') {
          await register(payload).unwrap();
        } else if (role === 'firms') {
          await registerFirm(payload).unwrap();
        } else if (role === 'organization') {
          await registerOrganization(payload).unwrap();
        }
        toast.success('Registration successful!', { position: 'top-right' });
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } catch (err: any) {
        toast.error(err?.data?.message || 'Registration failed.', { position: 'top-right' });
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      <div className="hidden lg:flex items-center justify-center bg-secondary-300 lg:w-1/2 p-0 relative min-h-[30vh] lg:min-h-screen overflow-hidden">
        <img
          src={logoA}
          alt="Judge"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        />
        <div className="absolute inset-0 bg-primary-800/75 bg-opacity-40" style={{ zIndex: 1 }} />
        <div className="relative z-10 text-center text-white max-w-md w-full">
          <h1 className="text-xl font-bold mb-2">Empower yourself with knowledge</h1>
          <h1 className="text-xl font-bold">the&nbsp; law starts with awereness</h1>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 min-h-[70vh] lg:min-h-screen">
        <h1 className="text-2xl text-secondary-300 font-bold mb-6 text-center">
          Welcome to MenyaLo
        </h1>
        <form className="w-full max-w-xs mx-auto" onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="w-full">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setErrors({ ...errors, role: '' });
                }}
                className="block w-full px-3 py-2 rounded-md border border-primary-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-800 sm:text-sm bg-white text-secondary-300"
              >
                <option value="">Register as</option>
                <option value="users">Users</option>
                <option value="firms">Firms</option>
                <option value="organization">Organization</option>
              </select>
              {errors.role && <span className="text-red-500 text-sm">{errors.role}</span>}
            </div>
          </div>
          {role === 'firms' || role === 'organization' ? (
            <>
              <div className="mb-4">
                <InPuts
                  placeholder="Organization Name"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="text-center"
                  error={errors.username}
                />
              </div>
              <div className="mb-4">
                <InPuts
                  placeholder="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="text-center"
                  type="email"
                  error={errors.email}
                />
              </div>
              <div className="mb-4">
                <InPuts
                  placeholder="Address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="text-center"
                  error={errors.address}
                />
              </div>
              <div className="mb-4">
                {/* <InPuts
                  placeholder="Law Domain"
                  name="lawDomain"
                  value={form.lawDomain}
                  onChange={handleChange}
                  className="text-center"
                  error={errors.lawDomain}
                /> */}
              </div>
              <div className="mb-4">
                <InPuts
                  placeholder="Registration Number"
                  name="registrationNumber"
                  value={form.registrationNumber}
                  onChange={handleChange}
                  className="text-center"
                  error={errors.registrationNumber}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <InPuts
                  placeholder="Username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  className="text-center"
                  error={errors.username}
                />
              </div>
              <div className="mb-4">
                <InPuts
                  placeholder="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="text-center"
                  type="email"
                  error={errors.email}
                />
              </div>
            </>
          )}
          <div className="mb-4">
            <InPuts
              placeholder="Password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="text-center"
              type="password"
              error={errors.password}
            />
          </div>
          <div className="mb-6">
            <InPuts
              placeholder="Confirm password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className="text-center"
              type="password"
              error={errors.confirmPassword}
            />
          </div>
          <div className="flex justify-center">
            <Button
              type="submit"
              disabled={loading}
              className="w-1/3 bg-primary-800 text-white py-2 rounded-md mb-2"
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
        <ToastContainer />
        <div className="text-center mt-6 w-full max-w-xs mx-auto">
          <p className="text-sm text-secondary-300">
            Already registered?{' '}
            <a
              href="#"
              className="text-primary-800 hover:underline font-bold"
              onClick={() => {
                navigate('/login');
              }}
            >
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
