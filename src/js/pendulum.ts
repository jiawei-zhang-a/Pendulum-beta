import * as UI from './ui';
import {init} from "./helloworld";

$(()=>{
    init();
    UI.loadTags();
    UI.loadShelves();
    UI.loadReference();
})
