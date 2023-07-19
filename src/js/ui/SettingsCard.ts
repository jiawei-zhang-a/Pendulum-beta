// // class SettingsCard {
//     private uid: string;
//     private card: HTMLElement | null;
//     private settings: any;
//
//     constructor(uid: string) {
//         this.uid = uid;
//         this.card = null;
//         this.settings = {};
//
//         // Fetch the initial settings from Pendulum
//         this.fetchSettings();
//     }
//
//     fetchSettings() {
//         // Use Pendulum to fetch the current settings. This will depend on your implementation of Pendulum.
//         // Here, assuming it provides a method `getSettings` that takes a UID and returns the settings.
//         Pendulum.getSettings(this.uid).then((settings: any) => {
//             this.settings = settings;
//             this.buildCard();
//         });
//     }
//
//     buildCard() {
//         // Create the card element with bootstrap styling
//         this.card = document.createElement('div');
//         this.card.classList.add('card', 'float-right');
//
//         // Add settings to the card
//         this.addSettingsToCard();
//
//         // Append the card to the color box
//         const colorBox = document.getElementById(this.uid);
//         if (colorBox) {
//             colorBox.appendChild(this.card);
//         }
//     }
//
//     addSettingsToCard() {
//         // Implement this based on your exact requirements.
//         // Add settings for visualization type, function type, color choice, and buttons for toggling real/imaginary and vector field/field line/both
//     }
// }
//
// export default SettingsCard;