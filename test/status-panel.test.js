'use strict';

const expect = require('expect.js');
const vscode = require('vscode');
const KiteStatus = require('../src/status-webview');
const {kite: Kite} = require('../src/kite');
const {fixtureURI, withPlan} = require('./helpers');

const {withKite, withKiteRoutes} = require('kite-api/test/helpers/kite');
const {fakeResponse} = require('kite-api/test/helpers/http');

const dot = '•';

let status;
const loadStatus = () => {
  beforeEach(() => {
    return status.getHTML()
          .then(html => document.body.innerHTML = html)
          .catch(err => console.log(err));
  });
};

describe('status panel', () => {
  before(function () {
    this.jsdom = require('jsdom-global')();
  });
  
  after(function () {
    this.jsdom();
  });
  
  beforeEach(() => {
    Kite.supportedLanguages = []
    status = new KiteStatus(Kite);
  });

  withKite({installed: false}, () => {
    loadStatus();

    it('shows a warning message stating kite is not installed', () => {
      const msg = document.querySelector('.status .text-danger');
      expect(msg.textContent).to.eql(`Kite engine is not installed ${dot}`);
    });

    it('shows a link to download kite', () => {
      const link = document.querySelector('.status a');

      expect(link.href).to.eql('https://kite.com/download')
      expect(link.textContent).to.eql('Install now')
    });

    it('does not render the account information', () => {
      expect(document.querySelector('.split-line')).to.be(null);
    });
  });

  withKite({running: false}, () => {
    loadStatus();
    
    it('shows a warning message stating kite is not running', () => {
      const msg = document.querySelector('.status .text-danger');
      expect(msg.textContent).to.eql(`Kite engine is not running ${dot}`);
    });

    it('shows a link to start kite', () => {
      const link = document.querySelector('.status a');

      expect(link.textContent).to.eql('Launch now')
    });

    it('does not render the account information', () => {
      expect(document.querySelector('.split-line')).to.be(null);
    });
  })

  withKite({reachable: false}, () => {
    loadStatus();
    
    it('shows a warning message stating kite is not reachable', () => {
      const msg = document.querySelector('.status .text-danger');
      expect(msg.textContent).to.eql(`Kite engine is not reachable`);
    });
  
    it('does not render the account information', () => {
      expect(document.querySelector('.split-line')).to.be(null);
    });
  });
  
  withKite({logged: false}, () => {
    loadStatus();
    
    it('shows a warning message stating the use is not logged in', () => {
      const msg = document.querySelector('.status .text-danger');
      expect(msg.textContent).to.eql(`Kite engine is not logged in ${dot}`);
    });
    
    it('shows a login action', () => {
      const link = document.querySelector('.status a');
      
      expect(link.textContent).to.eql('Login now')
    });
    
    it('does not render the account information', () => {
      expect(document.querySelector('.split-line')).to.be(null);
    });
  });  
  
  withKite({logged: true}, () => {
    describe('with no editor open', () => {
      loadStatus();
      
      it('says that kite status will be available by opening a file', () => {
        const msg = document.querySelector('.status div');
        expect(msg.textContent).to.eql(`Open a supported file to see Kite's status ${dot}`);
      });
    })

    describe('with a non-supported editor open', () => {
      beforeEach(() => {
        Kite.supportedLanguages = ['python'];
        const uri = vscode.Uri.file(fixtureURI('hello.json'));

        return vscode.workspace.openTextDocument(uri)
      });

      loadStatus();
      
      it('says that kite status will be available by opening a file', () => {
        const msg = document.querySelector('.status div');
        expect(msg.textContent).to.eql(`Open a supported file to see Kite's status ${dot}`);
      });
    });

    withPlan('enterprise', {
      status: 'active',
      active_subscription: 'enterprise',
      features: {},
      trial_days_remaining: 0,
      started_kite_pro_trial: false,
    }, () => {
      loadStatus();

      it('displays an enterprise logo icon', () => {
        expect(document.querySelector('.split-line .left .enterprise svg')).not.to.be(null);
      });

      it('displays a link to the user account', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql('Account');
        expect(link.href).to.eql('http://localhost:46624/clientapi/desktoplogin?d=/settings/acccount');
      });
    });

    withPlan('active pro', {
      status: 'active',
      active_subscription: 'pro',
      features: {},
      trial_days_remaining: 0,
      started_kite_pro_trial: false,
    }, () => {
      loadStatus();

      it('displays a pro icon', () => {
        expect(document.querySelector('.split-line .left .pro svg')).not.to.be(null);
      });

      it('displays a link to the user account', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql('Account');
        expect(link.href).to.eql('http://localhost:46624/clientapi/desktoplogin?d=/settings/acccount');
      });
    });
    
    withPlan('trialing pro with more than 6 days remaining', {
      status: 'trialing',
      active_subscription: 'pro',
      features: {},
      trial_days_remaining: 9,
      started_kite_pro_trial: true,
    }, () => {
      loadStatus();
  
      it('displays a pro badge without the remaining days', () => {
        expect(document.querySelector('.split-line .left .pro svg')).not.to.be(null);
        const days = document.querySelector('.split-line .left .kite-trial-days');
        expect(days).to.be(null);
      });

      it('displays a link to the pro account help page', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql("What's this?");
        expect(link.getAttribute('onclick'))
        .to.eql("vscode.postMessage({command: 'command', name:'kite.web-url', args:['https://help.kite.com/article/65-kite-pro']})");
      });
    });

    withPlan('trialing pro with less than 5 days remaining', {
      status: 'trialing',
      active_subscription: 'pro',
      features: {},
      trial_days_remaining: 3,
      started_kite_pro_trial: true,
    }, () => {
      loadStatus();

      it('displays a pro badge with the remaining days in normal text', () => {
        expect(document.querySelector('.split-line .left .pro')).not.to.be(null);
        const days = document.querySelector('.split-line .left .kite-trial-days');
        expect(days).not.to.be(null);
        expect(days.textContent).to.eql('Trial: 3 days left');
        expect(days.classList.contains('text-danger')).to.be(false);
      });

      it('displays a link to upgrade to a pro account', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql('Upgrade');
        expect(link.getAttribute('onclick'))
        .to.eql("vscode.postMessage({command: 'command', name:'kite.web-url', args:['http://localhost:46624/redirect/pro']})");
      });
    });

    withPlan('trialing pro with 0 days remaining', {
      status: 'trialing',
      active_subscription: 'pro',
      features: {},
      trial_days_remaining: 0,
      started_kite_pro_trial: true,
    }, () => {
      loadStatus();

      it('displays a pro badge with the remaining days in normal text', () => {
        expect(document.querySelector('.split-line .left .pro')).not.to.be(null);
        const days = document.querySelector('.split-line .left .kite-trial-days');
        expect(days).not.to.be(null);
        expect(days.textContent).to.eql('Trial: 0 days left');
        expect(days.classList.contains('text-danger')).to.be(false);
      });

      it('displays a link to upgrade to a pro account', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql('Upgrade');
        expect(link.getAttribute('onclick'))
        .to.eql("vscode.postMessage({command: 'command', name:'kite.web-url', args:['http://localhost:46624/redirect/pro']})");
      });
    });

    withPlan('community that did not trialed Kite yet', {
      status: 'active',
      active_subscription: 'community',
      features: {},
      trial_days_remaining: 0,
      started_kite_pro_trial: false,
    }, () => {
      loadStatus();

      it('displays as a kite basic account', () => {
        expect(
          document.querySelector('.split-line .left')
          .textContent
          .replace(/\s+/g, ' ')
          .trim()
        )
        .to.eql('kite_vector_icon Kite Basic');
      });

      it('displays a link to start a trial', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql('Start Pro trial');
        expect(link.getAttribute('onclick'))
        .to.eql("vscode.postMessage({command: 'command', name:'kite.web-url', args:['http://localhost:46624/redirect/trial']})");
      });
    });

    withPlan('community that already did the Kite trial', {
      status: 'active',
      active_subscription: 'community',
      features: {},
      trial_days_remaining: 0,
      started_kite_pro_trial: true,
    }, () => {
      loadStatus();

      it('displays as a kite basic account', () => {
        expect(
          document.querySelector('.split-line .left')
          .textContent
          .replace(/\s+/g, ' ')
          .trim()
        )
        .to.eql('kite_vector_icon Kite Basic');
      });

      it('displays a link to upgrade to a pro account', () => {
        const link = document.querySelector('.split-line .right a');
        expect(link).not.to.be(null);
        expect(link.textContent).to.eql('Upgrade');
        expect(link.getAttribute('onclick'))
        .to.eql("vscode.postMessage({command: 'command', name:'kite.web-url', args:['http://localhost:46624/redirect/pro']})");
      });

      describe('when the user has a verified email', () => {
        loadStatus();
  
        it('does not display a verification warning', () => {
          expect(document.querySelector('.kite-warning-box')).to.be(null);
        });
      });
  
      describe('when the user has an unverified email', () => {
        withKiteRoutes([[
          o => /^\/api\/account\/user/.test(o.path),
          o => fakeResponse(200, JSON.stringify({email_verified: false})),
        ]]);
  
        loadStatus();
  
        it('displays a verification warning', () => {
          expect(document.querySelector('.kite-warning-box')).not.to.be(null);
        });
      });
    });
  });
});