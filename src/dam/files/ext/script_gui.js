function random_color(){
	var color = '#', num;
	for (var i = 0; i <6; i++){
		num = Math.round(Math.random()*15);
		color += num.toString(16);	
	}
    return color;
    
}

var MDAction =  function(opts, layer) {	
	this.id = opts.id || Ext.id();
	this['in'] = opts['in'];
	this.out = opts.out; 
	this.inputs = opts.inputs || [];
	this.outputs = opts.outputs || [];
	opts.terminals = [];
	this.params = opts.params;
	opts.resizable = false;
	this.label = opts.label || opts.title;

	for(var i = 0 ; i < opts.inputs.length ; i++) {
		var input = this.inputs[i];
		opts.terminals.push({
			"name": input, 
			"direction": [-1,0], 
			"offsetPosition": {"left": -14, "top": 3+23*(i+1) }, 
			"ddConfig": {
				"type": "input",
				"allowedTypes": ["output"]
			} ,
			wireConfig:{
				color: random_color()
			}
		});
	}
	for(i = 0 ; i < this.outputs.length ; i++) {
		var output = this.outputs[i];
		opts.terminals.push({
			"name": output, 
			"direction": [1,0], 
			"offsetPosition": {"right": -14, "top": 3+10*(i+1+this.inputs.length) }, 
			"ddConfig": {
				"type": "output",
				"allowedTypes": ["input"]
			},
			"alwaysSrc": true,
			wireConfig:{
				color: random_color()
			}
		});
	}
	
	
	
	MDAction.superclass.constructor.call(this, opts, layer);
	layer.containers.push(this);

}; 
YAHOO.lang.extend(MDAction, WireIt.Container, {
		
	getXY: function(){
		return Ext.get(this.el).getXY();
	},
	
	getOutputs: function(){
		var outputs = [];
		var output_wires= this.getTerminal(this.outputs).wires;
		Ext.each(output_wires, function(wire){
			if (wire)
				outputs.push(wire.label);
		});
		return outputs;

	},
	
	getInputs: function(){
		var inputs = [];
		var input_wires= this.getTerminal(this.inputs).wires;
		Ext.each(input_wires, function(wire){
			if (wire)
				inputs.push(wire.label);
		});
		return inputs;

	},
	
	getParams: function(){
		return this.form.getForm().getValues();
		
	},
	
	onAddWire: function(e, args){
		var wire = args[0];
		wire.label = Ext.id();
		var terminal_out = wire.terminal2;
		var terminal_in = wire.terminal1;
		var values = terminal_in.container.form.getForm().getValues();
		var output_variant = values.output_variant || values.source_variant;
		
		if (output_variant){
			terminal_out.container.form.getForm().setValues({
				source_variant: output_variant
			});			
		}
		
		
		
		
	
		
	},
	
	render: function(){
		
	 	MDAction.superclass.render.call(this);
	 	
	 	var form = new Ext.form.FormPanel({
//	 		renderTo: this.bodyEl,
	 		bodyStyle: {paddingTop: 10},
	 		autoHeight: true,
	 		autoScroll: true,
	 		border: false,
	 		items: this.params,
	 		
//	 		collapsible: true,
	 		listeners:{
	 			afterrender:function(){
	 				this.collapse();
	 			
	 			}
	 		}
	 	});
	 	this.form = form;
	 	
	 	this.label = new Ext.form.TextField({
 			value: this.label,
 			width: 300 			
 		}); 		
	 	
 		var BUTTON_EDIT = 'Edit', BUTTON_HIDE = 'Hide';
	 	var panel = new Ext.Panel({
	 		renderTo: this.bodyEl,
	 		items: [
	 		
	 		
	 		new Ext.form.CompositeField({
	 			items:[
	 				this.label,
			 		new Ext.Button({
			 			text: BUTTON_EDIT,
			 			
			 			handler: function(){
			 				if (this.getText() == BUTTON_EDIT){
			 					this.setText(BUTTON_HIDE);
			 					form.expand();	
			 				}
			 				else{
			 					this.setText(BUTTON_EDIT);
			 					form.collapse();	
			 				
			 				}
			 				
			 			}
			 		})
	 			]
	 		
	 		}),
	 		
	 		form
	 		],
	 		border: false
	 	
	 	});
	}

});


var baseLayer, store, layer_el;

function save_script(params){
	var invalid = false;
	var action_invalid;
	var tmp;
	
	for (var i = 0; i < baseLayer.containers.length; i++){
		tmp = baseLayer.containers[i];
		if (!tmp.form.getForm().isValid()){
			action_invalid = tmp.label.getValue();
			invalid = true
		}
		
	}
	if(invalid){
		Ext.Msg.alert('Save', String.format('Saving failed. Please check action "{0}", some of its required fields are missing.', action_invalid));
		return;
	}
	
	Ext.Ajax.request({
		url: '/edit_script/',
		params: params,
		success: function(response){
//		  	Ext.MsgBox.msg('','Script saved');
			Ext.Msg.alert('Save', 'Script saved successfully.');
			
			if (! script_pk)
				script_pk = Ext.decode(response.responseText).pk;
			try{
				window.opener.scripts_jsonstore.reload();
			}
			catch(e){}
		},
		failure: function(){
//		            			Ext.MsgBox.msg('','Save failed');
			Ext.Msg.alert('Save', 'Saving script  failed'); 
		}
		
		
	});


};

//YAHOO.inputEx.spacerUrl = "/files/WireIt-0.5.0/lib/inputex/images/space.gif";

Ext.onReady(function(){
	Ext.get('switch_ws_bar').setStyle({marginTop: 10});
	Ext.get('switch_ws_bar').dom.innerHTML = workspace.name;
	
	var store = new Ext.data.JsonStore({
		url:'/get_actions/',
		fields:['name', 'params'],
//			autoLoad: true,
		root: 'scripts'	,
		sortInfo: {
		    field: 'name',
		    direction: 'ASC'
		}
	});
	
	new Ext.Viewport({
		layout: 'border',
		items:[
			header,
					
			new Ext.grid.GridPanel({
				region: 'east',
				title: 'Actions',
				layout: 'fit',
				width: 200,
//				autoHeight: true,
				
				enableDragDrop: true,
				ddGroup: 'wireit',		
				
					store: store,
					columns:[{
						name: 'Script',
						dataIndex: 'name'
					}],
				hideHeaders: true,
				sm: new Ext.grid.RowSelectionModel({
					singleSelect: true
				}),
				viewConfig: {
					forceFit: true
				}
		
				
			}),
			
			new Ext.Panel({
				region: 'center',
				items: new Ext.BoxComponent({
			    autoEl: {
			        tag: 'div',
			        id: "wire-layer",
			        'class':"wireit"
			        
			    },
						
				region: 'center',
				listeners:{
					afterrender: function(){
						layer_el = this.getEl();						
						baseLayer = new WireIt.Layer({
							layerMap: false,
							parentEl: layer_el
							
						});
						
						baseLayer.getJson =  function(){
								var actions_json = {};
								
								Ext.each(this.containers, function(action){
									if (action){
										
										var posXY = action.getXY();
										
										actions_json[action.id] = {
											params: action.getParams(),
											'in': action.getInputs(),
											out: action.getOutputs(),
											script_name: action.options.title,
											x: posXY[0],
											y: posXY[1],
											label: action.label.getValue()
										}					
									
									}
							}
							
							
							);
								return actions_json;
						
						};
		


						
						
          new Ext.dd.DropZone(Ext.get('wire-layer'),{
          	ddGroup: 'wireit',
          	onContainerOver: function(){
          		return this.dropAllowed;
          	},
          	onContainerDrop: function( source, e, data ){
          		
          		
          		var params = data.selections[0].data.params;
          		var script_name = data.selections[0].data.name;
          		var fields = [];
          		
          		
          		var drop_x = e.xy[0];
          		var drop_y = e.xy[1];
          	
          		var action = new MDAction({
			            title: script_name,
			            label: params.label,
			            position:[drop_x,drop_y],
//			            legend:'thumbnail',
			           
		            	inputs: ['in'],
		            	outputs: ['out'],
			            params: params
			            
			    }, baseLayer);
			   
          	} 
          	
          });
           
          store.load({
          	callback:function(){
          		if (script_name)
          			Ext.getCmp('script_name').setValue(script_name);
          		
          		if (params){
          			
          			var action;
          			for (action_name in params){
          				if (action_name){

          					action = params[action_name];
          					
          					var action_stored = store.query('name', action.script_name).items;
          					
          					if(action_stored.length > 0){
          						action_stored = action_stored[0];
//          						console.log(action_stored = action_stored[0]);
          						var action_box = new MDAction({
						            title: action_stored.data.name,
						            position:[20,20],
			//			            legend:'thumbnail',
						           	'in': action['in'],
						           	'out': action['out'],
					            	inputs: ['in'],
					            	outputs: ['out'],
					            	position: [action.x, action.y],
						            params: action_stored.data.params,
						            label: action.label
						            
						    	}, baseLayer); 
						    	action_box.form.getForm().setValues(action.params);
          						
          						Ext.each(action_box.form.items.items, function(field){          						
          							if (field.data_loaded)
          								field.data_loaded(action.params);
          								
          						});
          						
          					}
          					
          					
          				}
          			}
          			var w;
          			Ext.each(baseLayer.containers, function(action){
          			
						Ext.each(baseLayer.containers, function(inner_action){
							
							Ext.each(action['out'], function(out){
								Ext.each(inner_action['in'], function(_in){
									
									if (out && out == _in){
										w = new WireIt.Wire(action.getTerminal('out'), inner_action.getTerminal('in'), layer_el.dom.childNodes[0], {color: action.getTerminal('out').options.wireConfig.color});
//								
										w.drawBezierCurve();	
									}
									
								});
								
							});
							if(action['out'][0] &&  action['out'][0] == inner_action['in'][0] ){
								
								
								
							}	
						});
					
					
					});
          			
          		}
          	}
          
          });
						
						
						
					}
				}
			
			}),
				tbar: new Ext.Toolbar({
//				   region: 'north',
				    
				    height: 25,
				    items: [
					    {
						    xtype: 'tbtext', 
						    text: 'Name: '
					    } ,
				   		{
					   		id: 'script_name',
				            xtype: 'textfield',
				            name: 'name',
				            allowBlank: false
			//	            emptyText: 'new script'
			        	},
                        {xtype: 'tbseparator'},
                        //~ {
                            //~ text:'Events',
                            //~ menu: new Ext.ux.StoreMenu({
                                //~ store_cfg: {
                                    //~ url: '/get_events/',
                                    //~ root:'events',
                                    //~ fields: ['id', 'text', 'checked'],
                                    //~ baseParams:{
                                        //~ script_id: script_pk
                                    //~ }
                                //~ },                                
                                //~ item_text_field: 'name',
                                //~ item_cfg: {
                                        //~ hideOnClick: true,
                                        //~ xtype: 'menucheckitem'
                                //~ },                               
                            //~ })
                            //~ 
                        //~ },
                        {                           
                            text:'Events',                            
                            menu: new Ext.ux.StoreMenu({
                                id: 'events',
                                store_cfg: {
                                    url: '/get_events/',
                                    root:'events',
                                    fields: ['id', 'text', 'checked'],
                                    baseParams:{
                                        script_id: script_pk
                                    }
                                },                                
                                item_text_field: 'name',
                                item_cfg: {
                                        hideOnClick: false,
                                        xtype: 'menucheckitem',
                                        handler: function(event){
                                            
                                            (function(){
                                                var record = event.ownerCt.store.getById(event.id);
                                                console.log('event.checked '+ event.checked);
                                                record.set('checked', event.checked);
                                                record.commit();
                                            }).defer(100);
                                        }
                                },                               
                                getValue: function(){
                                    var records_checked = this.store.query('checked', true);                                    
                                    var values = []
                                    Ext.each(records_checked.items, function(record){
                                        values.push(record.data.id);
                                    });
                                    return values;
                                }
                            })
                            
                        },
                        
                        {                           
                            text:'Media',                            
                            //~ menu: new Ext.ux.StoreMenu({
                                //~ id: 'media_types',
                                //~ store_cfg: {
                                    url: '/get_types/',
                                    //~ data: {'types':[{'pk': 1,'text': 'image'}, {'pk': 2,'text': 'audio'},{'pk': 3,'text': 'video'},{'pk': 4,'text': 'doc'}]},
                                    //~ root:'types',
                                    //~ idProperty: 'pk',
                                    //~ fields: ['pk', 'text', 'checked'],
                                    //~ baseParams:{
                                        //~ script_id: script_pk
                                    //~ }
                                //~ },                                
                                //~ item_text_field: 'name',
                                //~ item_cfg: {
                                        //~ hideOnClick: false,
                                        //~ xtype: 'menucheckitem',
                                        //~ handler: function(obj){
                                            //~ 
                                            //~ (function(){
                                                //~ var record = obj.ownerCt.store.getById(obj.pk);
                                                //~ console.log('obj.checked '+ obj.checked);
                                                //~ record.set('checked', obj.checked);
                                                //~ record.commit();
                                            //~ }).defer(100);
                                        //~ }
                                //~ },                                                               
                                //~ getValue: function(){
                                    //~ var records_checked = this.store.query('checked', true);                                    
                                    //~ var values = []
                                    //~ Ext.each(records_checked.items, function(record){
                                        //~ values.push(record.data.id);
                                    //~ });
                                    //~ return values;
                                //~ }
                            //~ })
                            handler: function(){
                                var expander = new Ext.ux.grid.RowExpander({
                                    tpl : new Ext.XTemplate(
                                        '<tpl for="mimetypes">',
                                            //~ '<input type="checkbox" name="{name}" class="{parent.name}" onclick="Ext.get(\'cb_{parent.name}\').dom.checked=true;"/> {name}',
                                            '<div><input style="margin-left: 20px;" type="checkbox" name="{name}" class="{parent.name}" onclick="if(!this.checked) Ext.get(\'cb_{parent.name}\').dom.checked=false;"/> <span style="padding-left:5px">{name}<span></div>',
                                        '</tpl>'                                       
                                    )
                                });
                                var win = new Ext.Window({
                                    width: 600,
                                    height: 300,
                                  
                                    items: new Ext.grid.GridPanel({
                                             store: new Ext.data.JsonStore({
                                            fields: ['name', 'mimetypes'],
                                            'root': 'types',                                
                                            data: {types:[{
                                                    name:'image',
                                                    mimetypes: [{
                                                        name: 'jpeg',
                                                        
                                                    },
                                                    {
                                                        name: 'png',
                                                        
                                                    }
                                                    ]
                                                },
                                                {
                                                    name:'audio',
                                                    mimetypes: [{
                                                        name: 'mp3',
                                                        
                                                    },
                                                    {
                                                        name: 'ogg',
                                                        
                                                    }
                                                    ]
                                                }
                                            ]}
                                        }),                            
                                        columns: [
                                                expander, 
                                                                             
                                                {id:'name',header: "Name",  dataIndex: 'name',
                                                renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                                                    var tpl = String.format('<input type="checkbox" id="cb_{0}" name="{0}" onclick="Ext.each(Ext.query(\'.{0}\'),function(cb){cb.checked=true;})"/><span style="padding-left:5px">{0}</span>', record.data.name);
                                                    return tpl;
                                                }
                                            }
                                        ],
                                        plugins: expander,
                                        viewConfig: {
                                            forceFit:true
                                        },        
                                        width: 600,
                                        height: 300,                            
                                        title: 'Media Types'
                                            
                                        })
                                })
                                win.show();
                                
                            }
                            
                            
                            
                        },
                        
                        
                        
                        
			        	//~ {
						    //~ xtype: 'tbtext', 
						    //~ text: 'Event: '
					    //~ } ,
			        	//~ 
			        	//~ {
					   		//~ id: 'script_type',
					   		//~ 
				            //~ xtype: 'combo',
				            //~ name: 'type',
				            //~ allowBlank: true,	             
						    //~ autoSelect: true,
						    //~ editable: false,
						    //~ triggerAction: 'all',
						    //~ lazyRender:true,
						    //~ mode: 'local',
						    //~ store:  new Ext.data.ArrayStore({        
					        	//~ fields: ['pk', 'name'],
					        	//~ data: types_available
				    		//~ }),		
					    //~ 
						    //~ value: script_type,
							    //~ 
						    //~ valueField: 'pk',
						    //~ displayField: 'name'
					            //~ 
				//~ 
				        	//~ },
				        	
				        	{xtype: 'tbseparator'},
				        	
				        {				            
				            text: 'Save',
				            id: 'save_button',
				            icon: '/files/images/icons/save.gif',
				            handler: function(){
				            	var button = Ext.getCmp('save_button');
				            	if (Ext.getCmp('script_name').isValid()){
			            				
			            				var submit_params =  {
											pk: script_pk,
											name: Ext.getCmp('script_name').getValue(),
											events: Ext.getCmp('events').getValue(),
											params: Ext.encode(baseLayer.getJson())		            			
										};
										save_script(submit_params);	   		
									
				            		
				            			            		
				            	}
				            	else
				            		Ext.Msg.alert('Save', 'Saving script failed, invaild name');
				            }
				        },{
				        	text: 'Delete',
				        	icon: '/files/images/icons/fam/delete.gif',
				        	handler: function(){
				        		if (script_pk)
					        		Ext.Msg.show({
					        			title:'Delete Script?',
									   msg: 'Are you sure you want to delete this script?',
									   buttons: Ext.Msg.YESNO,
									   fn: function(btn){
										   	if (btn == 'yes'){
										   		
												Ext.Ajax.request({
													url: '/delete_script/',
													params:{
														pk: script_pk
													},
													success: function(){
														window.opener.scripts_jsonstore.reload({
															callback: function(){
																window.close();
															}
														});
														
													
													}
												});
										   		
										   	}
									   },
								   
								   icon: Ext.MessageBox.QUESTION}
				        		
				        		);
				        		
				        	}
				        
				        }
				    ]
				})
				
				
			
			})
						
		
		
		]
	});
	
	
});

	
