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

function renderLogos() {
  //Order the logos array so that the logo with the most votes is on top
  logoArray = logoArray.sort(function(a,b){return b.votes-a.votes})
  //Get the template we created in a block scoped variable
  let template = $('#template').html();
  //Use mustache parse function to speeds up on future uses
  Mustache.parse(template);
  //Create variable with result of render func form template and data
  let rendered = Mustache.render(template, {logoArray});
  //Use jquery to add the result of the rendering to our html
  $('#logoBody').html(rendered);
}

//Create a asynchronous read call for our smart contract
async function callStatic(func, args) {
  //Create a new contract instance that we can interact with
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to get data of smart contract func, with specefied arguments
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  //Make another call to decode the data received in first call
  const decodedGet = await calledGet.decode().catch(e => console.error(e));

  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  //Make a call to write smart contract func, with aeon value input
  const calledSet = await contract.call(func, args, {amount: value}).catch(e => console.error(e));

  return calledSet;
}

//Execute main function
window.addEventListener('load', async () => {
  //Display the loader animation so the user knows that something is happening
  $("#loader").show();

  //Initialize the Aepp object through aepp-sdk.browser.js, the base app needs to be running.
  client = await Ae.Aepp();

  //First make a call to get to know how may logos have been created and need to be displayed
  //Assign the value of logo length to the global variable
  logosLength = await callStatic('getLogosLength', []);

  //Loop over every logo to get all their relevant information
  for (let i = 1; i <= logosLength; i++) {

    //Make the call to the blockchain to get all relevant information on the logo
    const logo = await callStatic('getLogo', [i]);

    //Create logo object with  info from the call and push into the array with all logos
    logoArray.push({
      creatorName: logo.name,
      logoUrl: logo.url,
      index: i,
      votes: logo.voteCount,
    })
  }

  //Display updated logos
  renderLogos();

  //Hide loader animation
  $("#loader").hide();
});

//If someone clicks to vote on a logo, get the input and execute the voteCall
jQuery("#logoBody").on("click", ".voteBtn", async function(event){
  $("#loader").show();
  //Create two new let block scoped variables, value for the vote input and
  //index to get the index of the logo on which the user wants to vote
  let value = $(this).siblings('input').val(),
      index = event.target.id;

  //Promise to execute execute call for the vote logo function with let values
  await contractCall('logoVote', [index], value);

  //Hide the loading animation after async calls return a value
  const foundIndex = logoArray.findIndex(logo => logo.index == event.target.id);
  //console.log(foundIndex);
  logoArray[foundIndex].votes += parseInt(value, 10);

  renderLogos();
  $("#loader").hide();
});

//If someone clicks to register a logo, get the input and execute the registerCall
$('#registerBtn').click(async function(){
  $("#loader").show();
  //Create two new let variables which get the values from the input fields
  const name = ($('#regName').val()),
        url = ($('#regUrl').val());

  //Make the contract call to register the logo with the newly passed values
  await contractCall('setLogo', [url, name], 0);

  //Add the new created logoobject to our logoarray
  logoArray.push({
    creatorName: name,
    logoUrl: url,
    index: logoArray.length+1,
    votes: 0,
  })

  renderLogos();
  $("#loader").hide();
});