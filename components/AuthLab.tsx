import React, { useState, useEffect } from 'react';
import { User, Shield, Lock, Mail, Link as LinkIcon, AlertTriangle, CheckCircle2, UserCircle2, ArrowRight, RefreshCw, AlertCircle, HelpCircle, Settings, ExternalLink } from 'lucide-react';
import { linkWithCredential, EmailAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail } from '../services/firebase';

interface AuthLabProps {
  authInstance: any; // Real Firebase Auth Instance
}

export const AuthLab: React.FC<AuthLabProps> = ({ authInstance }) => {
  const [user, setUser] = useState<any>(authInstance?.currentUser || null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  
  // Modal State for Conflict Handling
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showResetOption, setShowResetOption] = useState(false);

  useEffect(() => {
    if (authInstance) {
      // Subscribe to user changes
      const unsubscribe = authInstance.onAuthStateChanged((u: any) => {
        setUser(u);
      });
      return () => unsubscribe();
    }
  }, [authInstance]);

  if (!authInstance) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
          <Shield className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Laboratorio de Autenticación Inactivo</h3>
        <p className="text-slate-500 max-w-md mt-2 mb-6">
          Para usar este laboratorio, primero debes ejecutar el <strong>Diagnóstico de Firebase</strong> con éxito para establecer una conexión real.
        </p>
        <div className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-1 rounded">
          Tip: Ve a la pestaña "Firebase", ingresa tu config y presiona "Iniciar Diagnóstico".
        </div>
      </div>
    );
  }

  const handleLinkAccount = async () => {
    if (!user || !email || !password) return;
    setStatus('loading');
    setMessage('');
    setErrorDetail(null);

    try {
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(user, credential);
      
      setStatus('success');
      setMessage('¡Cuenta vinculada exitosamente! Tu usuario anónimo ahora es permanente.');
      setPassword(''); // Clear password for security
    } catch (error: any) {
      console.error("Link Error:", error);
      setStatus('error');
      
      // Manejo de errores específicos
      if (error.code === 'auth/credential-already-in-use') {
        setMessage('Esta cuenta de correo ya está asociada a otro usuario.');
        setShowConflictModal(true);
      } else if (error.code === 'auth/operation-not-allowed') {
        setMessage('El proveedor Email/Password no está habilitado.');
        setErrorDetail('Ve a Firebase Console > Authentication > Sign-in method y habilita "Correo electrónico/contraseña".');
      } else if (error.code === 'auth/network-request-failed') {
        setMessage('Error de conexión con Firebase.');
        setErrorDetail('Verifica tu conexión a internet o configuración de red. Si ocurre consistentemente, puede ser un bloqueo de CORS o Firewall.');
      } else if (error.code === 'auth/weak-password') {
        setMessage('La contraseña es demasiado débil. Usa al menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        setMessage('El formato del correo electrónico no es válido.');
      } else {
        setMessage(error.message || 'Error al vincular cuenta.');
      }
    }
  };

  const handleSignInOverride = async () => {
    setStatus('loading');
    setMessage('Intentando cambiar de usuario...');
    setErrorDetail(null);
    setShowResetOption(false);
    
    try {
      await signInWithEmailAndPassword(authInstance, email, password);
      setStatus('success');
      setMessage('Has iniciado sesión en la cuenta existente. La sesión anónima anterior se ha descartado.');
      setShowConflictModal(false);
      setPassword('');
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error al iniciar sesión: ${error.message}`);
      
      if (error.code === 'auth/wrong-password') {
        setShowResetOption(true);
      }
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(authInstance, email);
      alert(`Se ha enviado un correo de recuperación a ${email}`);
    } catch (error: any) {
      alert(`Error al enviar correo: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Visor de Estado de Usuario */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <UserCircle2 className="text-blue-500" size={20} />
            Usuario Actual
          </h2>
          {user?.isAnonymous ? (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200">
              ANÓNIMO
            </span>
          ) : (
             <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
              VERIFICADO
            </span>
          )}
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Firebase UID</label>
            <div className="font-mono text-xs md:text-sm bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto">
              {user?.uid || 'No user connected'}
            </div>
          </div>
          <div className="space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Vinculado</label>
                <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  {user?.email || 'Sin email (Cuenta Anónima)'}
                </div>
             </div>
             <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Creado</label>
                <div className="text-sm text-slate-600">
                  {user?.metadata?.creationTime || 'Desconocido'}
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Formulario de Vinculación Inteligente */}
      <div className={`rounded-xl border transition-all duration-300 ${
        status === 'success' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
      }`}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
            <LinkIcon className={status === 'success' ? 'text-green-600' : 'text-orange-500'} size={20} />
            {user?.isAnonymous ? 'Convertir a Cuenta Permanente' : 'Cuenta Segura'}
          </h3>
          
          {user?.isAnonymous ? (
            <>
              <p className="text-slate-600 text-sm mb-6">
                Ingresa credenciales para vincular este usuario anónimo. Esto permitirá iniciar sesión desde otros dispositivos sin perder datos.
              </p>
              
              <div className="grid gap-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Contraseña Nueva</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleLinkAccount}
                  disabled={status === 'loading' || !email || !password}
                  className="mt-2 w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                >
                   {status === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <Shield size={18} />}
                   Guardar Progreso (Vincular)
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-green-700">
               <CheckCircle2 size={24} />
               <div>
                 <p className="font-medium">Esta cuenta ya está vinculada a {user?.email}.</p>
                 <p className="text-xs opacity-80">Puedes cerrar sesión y volver a entrar con tus credenciales.</p>
               </div>
            </div>
          )}

          {/* Feedback Message */}
          {message && status !== 'loading' && !showConflictModal && (
            <div className={`mt-4 p-4 rounded-lg flex flex-col gap-1 text-sm ${
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              <div className="flex items-start gap-2 font-medium">
                {status === 'error' ? <AlertCircle size={16} className="mt-0.5" /> : <CheckCircle2 size={16} className="mt-0.5" />}
                {message}
              </div>
              
              {/* Detailed Instruction for Config Errors */}
              {errorDetail && (
                <div className="ml-6 mt-1 text-xs bg-white/50 p-2 rounded border border-red-200/50">
                  <p className="mb-2 font-semibold flex items-center gap-1">
                    <Settings size={12} /> Acción Requerida:
                  </p>
                  <p>{errorDetail}</p>
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Ir a Firebase Console <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Conflict Modal */}
      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
               <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                 <AlertTriangle size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-slate-900">Conflicto de Cuenta</h3>
                 <p className="text-sm text-slate-600 mt-1">
                   El correo <strong>{email}</strong> ya está registrado en Firebase.
                 </p>
               </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                 <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 opacity-60">
                    <h4 className="font-semibold text-slate-500 mb-1 flex items-center gap-2">
                      <LinkIcon size={16} /> Opción A: Fusionar
                    </h4>
                    <p className="text-xs text-slate-400">Fusionar los datos del usuario anónimo actual con la cuenta existente.</p>
                    <div className="mt-2 text-[10px] uppercase font-bold text-slate-400 bg-slate-200 inline-block px-2 py-0.5 rounded">No Implementado</div>
                 </div>

                 <div className="p-4 border-2 border-blue-100 rounded-xl bg-blue-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                       <UserCircle2 size={64} className="text-blue-600" />
                    </div>
                    <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                      <ArrowRight size={16} /> Opción B: Iniciar Sesión
                    </h4>
                    <p className="text-xs text-blue-700 mb-3">
                      Abandonar el usuario anónimo actual e ingresar a la cuenta existente. 
                      <span className="font-bold text-red-500 block mt-1">⚠️ Perderás los datos de la sesión anónima actual.</span>
                    </p>
                    
                    <button 
                      onClick={handleSignInOverride}
                      disabled={status === 'loading'}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      {status === 'loading' ? 'Procesando...' : 'Entrar a Cuenta Existente'}
                    </button>

                    {/* Reset Password Helper */}
                    {showResetOption && (
                      <div className="mt-3 pt-3 border-t border-blue-200 text-center animate-in slide-in-from-top-2">
                         <p className="text-xs text-red-600 font-medium mb-1 flex items-center justify-center gap-1">
                           <AlertCircle size={12} /> Contraseña incorrecta
                         </p>
                         <button 
                           onClick={handlePasswordReset}
                           className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto"
                         >
                           ¿Olvidaste tu contraseña? <HelpCircle size={12} />
                         </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  setShowConflictModal(false);
                  setStatus('idle');
                  setMessage('');
                  setErrorDetail(null);
                }}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};