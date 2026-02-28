// ============================================================================
// IMPORTS DO REACT
// ============================================================================
// Biblioteca principal do React para construção de interfaces de usuário

// useState: Hook para gerenciar estado local de componentes
// useRef: Hook para criar referências mutáveis que persistem entre renders
// useEffect: Hook para executar efeitos colaterais (side effects) como chamadas de API, listeners, etc
// useMemo: Hook para memoizar valores computados e otimizar performance
// useCallback: Hook para memoizar funções e evitar re-criações desnecessárias
// memo: Higher-Order Component para memoizar componentes e evitar re-renders desnecessários
import React, { useState } from 'react';
// ============================================================================
// ÍCONES - LUCIDE REACT
// ============================================================================
// Biblioteca de ícones SVG modernos e leves utilizados em toda a interface
import {
    Trash2, User, Save, X, CircleUserRound,
    LogOut, Mail, ShieldAlert,
    Eye,
    EyeOff,
    ImageIcon
} from 'lucide-react';

// Configurações de Perfil
export const ProfileModal = ({ user, onClose, onUpdateName, onUpdatePassword, onDeleteAccount, onLogout, onUpdatePhoto, onDeletePhoto }) => { // <--- Adicionamos onUpdatePhoto aqui
    const [newName, setNewName] = useState(user?.displayName || "");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState("");
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border dark:border-gray-700">

                {/* Header */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <CircleUserRound size={20} />
                        Configurações da Conta
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
                </div>

                <div className="flex min-h-[300px]">
                    {/* Sidebar do Modal */}
                    <div className="w-1/3 bg-gray-50 dark:bg-gray-900/30 border-r dark:border-gray-700 p-2 space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full text-left px-3 py-2 rounded text-xs font-bold flex items-center gap-2 ${activeTab === 'general' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            <User size={14} /> Perfil
                        </button>
                        <button
                            onClick={() => setActiveTab('danger')}
                            className={`w-full text-left px-3 py-2 rounded text-xs font-bold flex items-center gap-2 ${activeTab === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500'}`}
                        >
                            <ShieldAlert size={14} /> Zona de Perigo
                        </button>
                    </div>

                    {/* Conteúdo */}
                    <div className="w-2/3 p-5 flex flex-col">
                        {activeTab === 'general' && (
                            <div className="space-y-5 flex-1 max-h-full overflow-y-auto pr-2">
                                {/* FOTO DE PERFIL */}
                                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                                    {!viewingPhoto ? (
                                        <>
                                            <div
                                                className="relative w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden cursor-pointer group bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                                onClick={() => setViewingPhoto(true)}
                                            >
                                                {user?.photoURL ? (
                                                    <img src={user.photoURL} alt="Foto de Perfil" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={48} className="text-gray-400" />
                                                )}
                                                {/* Overlay de Hover */}
                                                <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-colors">
                                                    <span className="text-white text-xs font-bold uppercase text-center">Ver<br />Opções</span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[200px]">Clique na imagem para opções.</span>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-900/50 p-4 rounded-xl border dark:border-gray-700 relative animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => setViewingPhoto(false)}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                                title="Voltar"
                                            >
                                                <X size={16} />
                                            </button>
                                            <div className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                {user?.photoURL ? (
                                                    <img src={user.photoURL} alt="Foto de Perfil" className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={64} className="text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 w-full mt-2">
                                                <button
                                                    onClick={() => {
                                                        document.getElementById('profile-upload').click();
                                                        setViewingPhoto(false);
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-colors"
                                                >
                                                    <ImageIcon size={14} />
                                                </button>
                                                {user?.photoURL && (
                                                    <button
                                                        onClick={() => {
                                                            if (onDeletePhoto) onDeletePhoto();
                                                            setViewingPhoto(false);
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        id="profile-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                if (onUpdatePhoto) onUpdatePhoto(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Email Logado</label>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                                        <Mail size={14} /> {user?.email}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Usuário</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="w-full border dark:border-gray-600 rounded p-2 text-sm dark:bg-gray-700 dark:text-white"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Seu Nome"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    onUpdateName(newName);
                                                }
                                            }}
                                        />
                                        <button onClick={() => onUpdateName(newName)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Salvar Nome"><Save size={16} /></button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Alterar Senha</label>
                                    <div className="flex gap-2">
                                        {/* Container Relativo para o Input e o Ícone */}
                                        <div className="relative flex-1">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                // Adicionado pr-10 para o texto não ficar embaixo do ícone
                                                className="w-full border dark:border-gray-600 rounded py-2 pl-2 pr-10 text-sm dark:bg-gray-700 dark:text-white"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Nova Senha"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        onUpdatePassword(newPassword);
                                                    }
                                                }}
                                            />
                                            {/* Ícone posicionado absolutamente dentro do container relativo */}
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                                tabIndex="-1"
                                            >
                                                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                        </div>

                                        {/* Botão de Atualizar fora do input */}
                                        <button
                                            onClick={() => onUpdatePassword(newPassword)}
                                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
                                            title="Atualizar Senha"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    onUpdatePassword(newPassword);
                                                }
                                            }}
                                        >
                                            <Save size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* --- NOVO BOTÃO DE SAIR --- */}
                                <div className="pt-4 mt-auto border-t dark:border-gray-700">
                                    <button
                                        onClick={onLogout}
                                        className="w-full flex items-center justify-center gap-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-sm font-bold"
                                    >
                                        <LogOut size={16} /> Sair da Conta
                                    </button>
                                </div>
                                {/* ------------------------ */}
                            </div>
                        )}

                        {activeTab === 'danger' && (
                            <div className="space-y-4">
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg text-red-800 dark:text-red-200 text-xs leading-relaxed">
                                    <strong>Atenção:</strong> Ao excluir sua conta, todos os seus dados serão apagados permanentemente. Esta ação é irreversível.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Digite "DELETAR" para confirmar</label>
                                    <input
                                        className="w-full border border-red-300 dark:border-red-800 rounded p-2 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                        value={confirmDelete}
                                        onChange={(e) => setConfirmDelete(e.target.value)}
                                        placeholder="DELETAR"
                                    />
                                </div>

                                <button
                                    disabled={confirmDelete !== 'DELETAR'}
                                    onClick={onDeleteAccount}
                                    className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> Excluir Minha Conta
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};