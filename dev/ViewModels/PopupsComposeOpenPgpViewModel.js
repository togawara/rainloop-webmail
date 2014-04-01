/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @extends KnoinAbstractViewModel
 */
function PopupsComposeOpenPgpViewModel()
{
	KnoinAbstractViewModel.call(this, 'Popups', 'PopupsComposeOpenPgp');

	this.notification = ko.observable('');

	this.sign = ko.observable(true);
	this.encrypt = ko.observable(true);

	this.password = ko.observable('');
	this.password.focus = ko.observable(true);

	this.from = ko.observable('');
	this.to = ko.observableArray([]);
	this.text = ko.observable('');

	this.resultCallback = null;
	
	this.submitRequest = ko.observable(false);

	// commands
	this.doCommand = Utils.createCommand(this, function () {

		var
			self = this,
			bResult = true,
			oData = RL.data(),
			oPrivateKey = null,
			aPublicKeys = []
		;

		this.submitRequest(true);

		if (bResult && this.sign() && '' === this.from())
		{
			// TODO i18n
			this.notification('Please specify FROM email address');
			bResult = false;
		}

		if (bResult && this.sign())
		{
			oPrivateKey = oData.findPrivateKeyByEmail(this.from(), this.password());
			if (!oPrivateKey)
			{
				// TODO i18n
				this.notification('No private key found for "' + this.from() + '" email');
				bResult = false;
			}
		}

		if (bResult && this.encrypt() && 0 === this.to().length)
		{
			// TODO i18n
			this.notification('Please specify at least one recipient');
			bResult = false;
		}

		if (bResult && this.encrypt())
		{
			aPublicKeys = _.compact(_.union(this.to(), function (sEmail) {
				var aKeys = oData.findPublicKeysByEmail(sEmail);
				if (0 === aKeys.length && bResult)
				{
					// TODO i18n
					self.notification('No public key found for "' + sEmail + '" email');
					bResult = false;
				}
				
				return aKeys;
				
			}));

			if (bResult && (0 === aPublicKeys.length || this.to().length !== aPublicKeys.length))
			{
				bResult = false;
			}
		}

		_.delay(function () {

			if (self.resultCallback && bResult)
			{
				try {

					if (oPrivateKey && 0 === aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signClearMessage([oPrivateKey], self.text())
						);
					}
					else if (oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.signAndEncryptMessage(aPublicKeys, oPrivateKey, self.text())
						);
					}
					else if (!oPrivateKey && 0 < aPublicKeys.length)
					{
						self.resultCallback(
							window.openpgp.encryptMessage(aPublicKeys, self.text())
						);
					}
				}
				catch (e)
				{
					// TODO i18n
					self.notification('OpenPGP error: ' + e);
					bResult = false;
				}
			}

			if (bResult)
			{
				self.cancelCommand();
			}

			self.submitRequest(false);

		}, 10);

	}, function () {
		return !this.submitRequest() &&	(this.sign() || this.encrypt());
	});

	Knoin.constructorEnd(this);
}

Utils.extendAsViewModel('PopupsComposeOpenPgpViewModel', PopupsComposeOpenPgpViewModel);

PopupsComposeOpenPgpViewModel.prototype.clearPopup = function ()
{
	this.notification('');

	this.password('');
	this.password.focus(false);

	this.from('');
	this.to([]);
	this.text('');

	this.submitRequest(false);

	this.resultCallback = null;
};

PopupsComposeOpenPgpViewModel.prototype.onHide = function ()
{
	this.clearPopup();
};

PopupsComposeOpenPgpViewModel.prototype.onShow = function (fCallback, sText, sFromEmail, sTo, sCc, sBcc)
{
	this.clearPopup();

	var
		oEmail = new EmailModel(),
		sResultFromEmail = '',
		aRec = []
	;

	this.resultCallback = fCallback;

	oEmail.clear();
	oEmail.mailsoParse(sFromEmail);
	if ('' !== oEmail.email)
	{
		sResultFromEmail = oEmail.email;
	}

	if ('' !== sTo)
	{
		aRec.push(sTo);
	}
	
	if ('' !== sCc)
	{
		aRec.push(sCc);
	}

	if ('' !== sBcc)
	{
		aRec.push(sBcc);
	}

	aRec = aRec.join(', ').split(',');
	aRec = _.compact(_.map(aRec, function (sValue) {
		oEmail.clear();
		oEmail.mailsoParse(Utils.trim(sValue));
		return '' === oEmail.email ? false : oEmail.email;
	}));

	this.from(sResultFromEmail);
	this.to(aRec);
	this.text(sText);
};
