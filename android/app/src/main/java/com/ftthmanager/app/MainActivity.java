// package com.ftthmanager.app;

// import com.getcapacitor.BridgeActivity;

// public class MainActivity extends BridgeActivity {
// }

// Documentação: Inicialização do App Check nativo antes do carregamento do Capacitor
package com.ftthmanager.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

// Importações necessárias do Firebase
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Inicializa o núcleo do Firebase.
        // Agora funciona perfeitamente porque o google-services.json está na pasta.
        FirebaseApp.initializeApp(this);

        // 2. Instala o provedor de depuração diretamente na memória do Android
        FirebaseAppCheck firebaseAppCheck = FirebaseAppCheck.getInstance();
        firebaseAppCheck.installAppCheckProviderFactory(
                DebugAppCheckProviderFactory.getInstance());
    }
}