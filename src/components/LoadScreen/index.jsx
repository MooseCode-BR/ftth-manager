import LoadingFiber from "../../assets/loadingfiber";

export const LoadScreen = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-white dark:bg-black transition-colors">
            <div className="flex flex-col items-center animate-pulse">
                {/* Logo ou Ícone do App */}
                <div className="p-4 mb-6">
                    <LoadingFiber size={64} />
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    Carregando Sistema
                </p>
            </div>
        </div>
    );
}