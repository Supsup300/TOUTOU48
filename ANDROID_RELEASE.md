# TOUTOU48 V2 — publication Android

- Identifiant Android : `com.supatrik.toutou48v2`
- Nom : `TOUTOU48 V2`
- Version initiale : `2.0.0` (`versionCode 2`)
- Format Google Play : Android App Bundle (`.aab`)

## Générer le bundle

1. Installer Android Studio et le SDK Android 35.
2. Lancer `npm install`, puis `npm run android:sync`.
3. Ouvrir le dossier `android` dans Android Studio.
4. Configurer une clé de signature dans **Build > Generate Signed Bundle / APK**.
5. Choisir **Android App Bundle**, variante **release**.

Le fichier généré se trouve dans `android/app/build/outputs/bundle/release/`.

## Publicités

Le navigateur et la version de test utilisent des publicités simulées. Le pont `window.ToutouNativeAds` est prévu dans `dist/js/ad-manager.js` pour brancher ensuite un SDK publicitaire natif. Ne pas publier avec de vrais emplacements AdMob avant d’avoir ajouté le consentement, les identifiants d’annonces et testé les annonces de démonstration Google.

## Séparation avec la V1

L’identifiant `com.supatrik.toutou48v2` et les clés de sauvegarde `toutou48.*.v2` empêchent l’écrasement de la V1 et de sa progression.
