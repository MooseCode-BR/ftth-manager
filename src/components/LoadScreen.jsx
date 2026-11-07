/*
 * Componente responsável por exibir a tela de carregamento do sistema.
 * Suporta etapas dinâmicas, barra de progresso suave e indicação do projeto sendo carregado.
 */

import React from 'react';
import LoadingFiber from "./loadingfiber";

export const LoadScreen = ({
    stage = "Carregando Sistema",
    progress = 0,
    projectName = ""
}) => {
    const clampedProgress = Math.max(5, Math.min(100, progress || 0));

    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-white dark:bg-black transition-colors select-none p-4">
            <div className="flex flex-col items-center max-w-sm w-full text-center">
                {/* Logo / Animação de Fibra */}
                <div className="mb-4 flex items-center justify-center">
                    <LoadingFiber size={80} />
                </div>

                {/* Título do Aplicativo */}
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
                    FTTH Manager
                </h1>

                {/* Subtítulo ou Nome do Projeto */}
                <p className="text-xs text-gray-500 dark:text-gray-400 min-h-[1.5rem] flex items-center justify-center px-4">
                    {projectName ? (
                        <span className="truncate max-w-[280px]">
                            Carregando projeto <strong className="text-gray-800 dark:text-gray-200">"{projectName}"</strong>
                        </span>
                    ) : (
                        stage
                    )}
                </p>

                {/* Barra de Progresso com Transição Suave */}
                <div className="w-64 h-1.5 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-4 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${clampedProgress}%` }}
                    />
                </div>

                {/* Indicador de Porcentagem e Etapa */}
                <div className="flex items-center justify-between w-64 text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-mono">
                    <span className="truncate max-w-[190px] text-left">{stage}</span>
                    <span>{Math.round(clampedProgress)}%</span>
                </div>
            </div>
        </div>
    );
};
