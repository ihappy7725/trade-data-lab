let introTimer=null,introHasRun=false;
function finishBrandIntro(){if(introTimer!==null){clearTimeout(introTimer);introTimer=null}document.body.classList.remove('intro-playing');const el=$('#brand-intro');if(el)el.dataset.phase='complete'}
function startBrandIntro(){if(introHasRun||!state.motion){finishBrandIntro();return}introHasRun=true;document.body.classList.add('intro-playing');$('#brand-intro').dataset.phase='playing';introTimer=setTimeout(finishBrandIntro,1300)}
async function showHomeSection(id){finishBrandIntro();if(document.body.classList.contains('pair-view')){history.pushState(null,'','#/');await route()}document.getElementById(id)?.scrollIntoView({behavior:state.motion?'smooth':'instant',block:'start'})}
function homeCountries(){for(const side of ['a','b']){const card=$('#selected-'+side);if(!card)continue;const code=resolveCountry($('#country-'+side).value),label=state.lang==='en'?'Country '+side.toUpperCase():'나라 '+side.toUpperCase();card.innerHTML=`<span class="chosen-side">${label}</span><strong translate="no">${code||'—'}</strong><span class="chosen-name">${code?escapeHtml(name(code)):(state.lang==='en'?'Not selected':'선택 전')}</span><i aria-hidden="true">↗</i>`}}
document.querySelectorAll('[data-scroll]').forEach(button=>button.onclick=()=>showHomeSection(button.dataset.scroll));
document.querySelectorAll('[data-pick]').forEach(button=>button.onclick=()=>{$('#country-'+button.dataset.pick).focus({preventScroll:true});finishBrandIntro()});
$('#pair-form').addEventListener('focusin',finishBrandIntro);
for(const side of ['a','b']){const input=$('#country-'+side);input.addEventListener('input',homeCountries);input.addEventListener('change',homeCountries)}
$('#input-swap').onclick=()=>{const a=$('#country-a'),b=$('#country-b');[a.value,b.value]=[b.value,a.value];homeCountries()};
$('.back-to-top').onclick=()=>scrollTo({top:0,behavior:state.motion?'smooth':'instant'});
$('#single-country-form').onsubmit=event=>{event.preventDefault();const code=resolveCountry($('#country-single').value);if(!code){$('#single-notice').textContent=state.lang==='en'?'Choose a country from the list.':'목록에서 나라를 골라 주세요.';return}location.hash=`country/${code}/${state.meta.period.vote_end}`};
document.querySelectorAll('[data-feature]').forEach(button=>button.onclick=async()=>{if(button.dataset.feature==='country'){await showHomeSection('country-entry');$('#country-single').focus({preventScroll:true});return}const a=resolveCountry($('#country-a').value),b=resolveCountry($('#country-b').value);if(a&&b&&a!==b){location.hash=`pair/${a}/${b}`;return}await showHomeSection('compare-main');$('#country-a').focus({preventScroll:true})});
homeCountries();
if(['','#/','#'].includes(location.hash))startBrandIntro();else{document.body.classList.add('pair-view');document.querySelectorAll('.home-section').forEach(el=>el.hidden=true);finishBrandIntro()}
