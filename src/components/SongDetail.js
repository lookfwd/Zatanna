import React, { Component } from 'react';
import {Loader, Dimmer, Card, Grid, Button, Icon, Modal} from 'semantic-ui-react';
import web3 from '../ethereum/web3';
import ZatannaInstance from '../ethereum/Zatanna';
import Donate from './Donate';
import BuySong from './BuySong';
import {awsSigning} from '../utils.js';

class SongDetail extends Component {
  state = {
    purchased:false,
    artistID:'',
    artistName:'',
    id:'',
    name:'',
    cost:'',
    releaseDate:'',
    genere:'',
    s3Link:'',
    role:'',
    userAccount:'',
    loadingData:false,
    loading:false,
    errorMessage:'',
    msg:'',
  }

  async componentDidMount(){
    this.setState({loadingData:true});
    document.title = "Zatanna | Song Detail";

    try{
      const accounts = await web3.eth.getAccounts();
      const role = await ZatannaInstance.methods.getRole().call({from:accounts[0]});
      this.setState({role:role, userAccount:accounts[0]});

      if (role === '2'){
        let {artistID, id, name, cost, releaseDate, genere, s3Link} = await ZatannaInstance.methods.songDetail(this.props.match.params.id).call({from:accounts[0]});
        
        if (id !== '0'){  // i.e song exists!
          // Get artist details
          let artistDets = await ZatannaInstance.methods.artistDetail(artistID).call({from:accounts[0]});
          this.setState({artistID, artistName:artistDets[0], id, name, cost, releaseDate, genere, s3Link});

          let userDetail = await ZatannaInstance.methods.userDetail().call({from:accounts[0]});
          let dynamoRequest = {
            'retrieve':"SongPurchase",
            'sID':this.state.id,
            'uID':userDetail[0],
          }

          // Send request to AWS
          let response = await awsSigning(dynamoRequest,'v1/dynamoaction');
          if (response.data.body===true){
            this.setState({purchased:true});
          }

        }else{
          this.setState({errorMessage:'Song does not exists!'});
        }
      }

    }catch(err){
      console.log(err);
    }

    this.setState({loadingData:false});
  }

  renderSong = () => {
    if (!this.state.errorMessage){
      var date = new Date(this.state.releaseDate*1000);
      var year = date.getFullYear();
      var month = "0" + (date.getMonth()+1);
      var day = date.getDate();
      var formattedDate = day + '-' + month.substr(-2) + '-' + year;
      
      return (
        <Card>
          <Card.Content>
            <Card.Header>{this.state.name.split('.')[0]}</Card.Header>
            <Card.Meta>
              <span>Cost: {web3.utils.fromWei(this.state.cost,'ether')} ETH</span>
            </Card.Meta>
            <Card.Description>
              <p>Release Date: {formattedDate}</p>
              <p>Artist Name: {this.state.artistName}</p>
            </Card.Description>
          </Card.Content>
        </Card>
      );
    }else{
      return <h3>{this.state.errorMessage}</h3>;
    }
  }

  render() {
    if(this.state.loadingData){
      return (
        <Dimmer active inverted>
          <Loader size='massive'>Loading...</Loader>
        </Dimmer>
      );
    }

    return (
      <div>
        {this.state.role==='2' &&
          <div>
            <h2>Song Details:</h2>
            <Grid stackable>
              <Grid.Column width={12}>
                {this.renderSong()}
                <h3>Similar Songs</h3>
              </Grid.Column>
              {!this.state.errorMessage &&
                <Grid.Column width={4}>
                  <Button.Group vertical>
                    <Modal size='small'
                      trigger={
                      <Button icon labelPosition='left' className="primary" floated="right" basic>
                        <Icon name='ethereum' />
                        Donate
                      </Button>
                      }>
                      <Modal.Header>Donate to {this.state.artistName}</Modal.Header>
                      <Modal.Content>
                        <Donate role={this.state.role} userAccount={this.state.userAccount} artistID={this.state.artistID} artistName={this.state.artistName} />
                      </Modal.Content>
                    </Modal>

                    {!this.state.purchased &&
                      <Modal size='small'
                        trigger={
                        <Button icon labelPosition='left' className="primary" floated="right" basic>
                          <Icon name='heart outline' />
                          Buy Song
                        </Button>
                        }>
                        <Modal.Header>Buy This Song</Modal.Header>
                        <Modal.Content>
                          <BuySong role={this.state.role} userAccount={this.state.userAccount} songCost={this.state.cost} songID={this.state.id} songName={this.state.name} />
                        </Modal.Content>
                      </Modal>
                    }
                  </Button.Group>
                </Grid.Column>
              }
            </Grid>
          </div>
        }

        {this.state.role!=='2' &&
          <h2>You are not registered as an User!</h2>
        }
      </div>
    );
  }
}

export default SongDetail;