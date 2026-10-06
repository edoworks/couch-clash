import { scoreConfig } from './scores-integration/ui/config.mjs';
import { mountScores } from './scores-integration/ui/score-display.mjs';
const root=document.querySelector('[data-scoreboard]');
if(root && scoreConfig.enabled){
  root.hidden=false;
  const copy=document.querySelector('[data-score-copy]');
  if(copy)copy.textContent='Optional score display from BALLDONTLIE. Prediction outcomes stay host-confirmed; phones do not sync.';
  mountScores(root);
}
