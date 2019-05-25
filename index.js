const contractAddress = 'ct_Mw7DjutJSmDbdAJ1BQwpGBr7mH8TsS2TeUYiqxB28UWHLHZW2'; 
const contractSource = `contract LogoVote = 

record logo = 
  { creatorAddress : address,
    url            : string,
    name           : string,
    voteCounter    : int }

record state = 
  { logos       : map(int, logo),
    logosLength : int }

function init() = 
  { logos = {},
    logosLength = 0 }

public function getLogo(index : int) : logo =
  switch(Map.lookup(index, state.logos))
    None     => abort("There was no logo with this index registered.")
    Some(x)  => x

public stateful function setLogo(url' : string, name' : string) = 
  let logo = { creatorAddress = Call.caller, url = url', name = name', voteCounter = 0}
  let index = getLogosLength() + 1
  put(state { logos[index] = logo, logosLength = index })
  
public function getLogosLength() : int =
  state.logosLength
  
public stateful function logoVote(index : int) =
  let logo = getLogo(index)
  Chain.spend(logo.creatorAddress, Call.value)
  let updatedLogoCounter = logo.voteCounter + Call.value
  let updatedLogos = state.logos{ [index].voteCounter = updatedLogoCounter }
  put(state{ logos = updatedLogos })`;


var logoArray = [
 /* {"creatorName" : "AVC", "logoUrl": "https://www.avctucson.com/wp-content/uploads/2019/05/LogoAdvancedHorizontal-color.png", "votes" : 18, "index": 13},
  {"creatorName" : "InMind", "logoUrl": "https://wp.inmindsoftware.com/wp-content/uploads/2018/07/logo_welcome.png", "votes" : 17, "index": 22},
  {"creatorName" : "AE", "logoUrl": "https://forum.aeternity.com/uploads/db0917/original/1X/a85e547c4eb931e25e8803e2db50d62525d1b445.png", "votes" : 14, "index": 14},
*/];

var logosLength = 0;
var client = null;

function renderLogos()
{
  logoArray = logoArray.sort(function(a, b){ return b.votes-a.votes})
  var template = $('#template').html();
  Mustache.parse(template);
  var rendered = Mustache.render(template, {logoArray});
  $('#logoBody').html(rendered);
}

window.addEventListener('load', async () => {
  $("#loader").show();
  
  client = await Ae.Aepp();

  const contract = await client.getContractInstance(contractSource, {contractAddress});
  const calledGet = await contract.call('getLogosLength', [], {callstatic: true}).catch(e => console.error(e));
  console.log('calledGet', calledGet);

  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  console.log('decodedGet', decodedGet);

  renderLogos();

  $("#loader").hide();
});

jQuery("#logoBody").on("click", ".voteBtn", async function(event){
  const value = $(this).siblings('input').val();
  const dataIndex = event.target.id;
  const foundIndex = logoArray.findIndex(logo => logo.index == dataIndex);
  logoArray[foundIndex].votes += parseInt(value, 10);
  renderLogos();
});

$('#registerBtn').click(async function()
{
  var name =  ($('#regName').val()),
      url = ($('#regUrl').val());

  logoArray.push({
    creatorName: name,
    logoUrl: url,
    index: logoArray.length + 1,
    votes: 0
  })
  renderLogos();
});