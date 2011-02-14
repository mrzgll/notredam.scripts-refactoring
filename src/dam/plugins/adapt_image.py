from twisted.internet import defer, reactor
from mediadart import log
from mediadart.mqueue.mqclient_twisted import Proxy
import os

from django.core.management import setup_environ
import dam.settings as settings
setup_environ(settings)
from django.db.models.loading import get_models

get_models()

from dam.repository.models import *
from dam.variants.models import Variant    
from dam.workspace.models import DAMWorkspace

from uuid import uuid4

def new_id():
    return uuid4().hex

def inspect():
    return {
        'name': __name__,
        
        
        'parameter_groups':{
            'resize':['resize_w', 'resize_h'],
            'crop':['crop_x', 'crop_y', 'crop_w', 'crop_h', 'crop_ratio'],
            'watermark': ['pos_x_percent','pos_y_percent', 'wm_id']
        },
        'params':[
            {   
                'name': 'source_variant',
                'fieldLabel': 'Source Variant',
                'xtype': 'select',
                'values': [['original']],
                'description': 'input-variant',
                
                'help': ''
            },
            
            {   
                'name': 'source_variant',
                'fieldLabel': 'Output Variant',
                'xtype': 'select',
                'values': [['thumbnail'], ['preview'], ['fullscreen']],
                'description': 'output-variant',
                'default': 0,
                'help': ''
            },             
             {
              'xtype': 'fieldset',
              'title': 'Resize',
              'checkboxToggle': True,
              'collapsed': True,
              'items':[{
                    'xtype':'numberfield',
                    'name': 'resize_h',
                    'fieldLabel': 'height',                    
                    'description': 'height',
                    'minValue':0,
                    'value': 100,
                    'help': 'height of resized image in pixels'
                },
                {
                    'xtype':'numberfield',
                    'name': 'resize_w',
                    'fieldLabel': 'width',                    
                    'description': 'width',
                    'value': 100,
                    'minValue':0,
                    'help': 'width of resized image in pixels'
                },
                    
              ]
              },
               {
              'xtype': 'fieldset',
              'title': 'Crop',
              'checkboxToggle': True,
              'collapsed': True,
              'items':[{
                    'xtype':'numberfield',
                    'name': 'crop_h',
                    'fieldLabel': 'height',                    
                    'description': 'height',
                    'minValue':0,
                    'value': 100,
                    'help': 'heigth of crop area, default till bottom edge of image'
                },
                {
                    'xtype':'numberfield',
                    'name': 'crop_w',
                    'fieldLabel': 'width',                    
                    'description': 'width',
                    'value': 100,
                    'minValue':0,
                    'help': 'width of crop area, default till right edge of image'
                },
##                {
##                    'name': 'crop_x',
##                    'fieldLabel': 'X left corner',
##                    'xtype':'numberfield',
##                    'description': 'upper left corner',
##                    'default': 0,
##                    'help': 'x-coordinate of upper left pixel of crop area',
##                },                
##                
##                
##                {
##                    'name':'crop_y',
##                    'xtype':'numberfield',
##                    'fieldLabel': 'upper left corner',
##                    'description': 'upper left corner',
##                    'default': 0,
##                    'help': 'y-coordinate of upper left pixel of crop area',
##                }, 
#                {
#                    'name':'crop_ratio',
#                    'xtype':'textfield',
#                    'description': 'ratio x:y',
#                    'default': '1:1',
#                    'help': "the value x:y means to crop a centered area large 1/x of the original width and 1/y of the original height."
#                },

                
                    
              ]
              },
              
              
             
#            {
#             'type': 'group',
#             'name': 'resize', 
#             'fields':[
#                {
#                    'name': 'resize_h',
#                    'type': 'int',
#                    'description': 'height',
#                    'default': 100,
#                    'help': 'height of resized image in pixels'           
#                },
#                      
#                {
#                    'name': 'resize_w',
#                    'type': 'int',
#                    'description': 'width',
#                    'default': 100,
#                    'help': 'width of resized image in pixels'           
#                },
#             ]
#             
#             
#             },
#                  
#                  
#           
#            
#                  
#            
#            {
#                'name': 'actions',
#                'type': 'list',
#                'available_values':['resize', 'crop', 'watermark']
#                     
#            },
#            {
#                'name':  'crop_w',
#                'type': 'int',
#                'description': 'width',
#                'default': 100,
#                'help': 'width of crop area, default till right edge of image',
#            }, 
#            {
#                'name':'crop_h',
#                'type': 'int',
#                'description': 'width',
#                'default': 100,
#                'help': 'heigth of crop area, default till bottom edge of image',
#            }, 
#            {
#                'name': 'crop_x',
#                'type': 'int',
#                'description': 'upper left corner',
#                'default': 0,
#                'help': 'x-coordinate of upper left pixel of crop area',
#            }, 
#            {
#                'name':'crop_y',
#                'type': 'int',
#                'description': 'upper left corner',
#                'default': 0,
#                'help': 'y-coordinate of upper left pixel of crop area',
#            }, 
#            {
#                'name':'crop_ratio',
#                'type': 'string',
#                'description': 'ratio x:y',
#                'default': '1:1',
#                'help': "the value x:y means to crop a centered area large 1/x of the original width and 1/y of the original height."
#            },
#            
#            {
#                'name': 'wm_id',
#                'type': 'component_id',
#                'description': 'component',
#                'default': '',
#                'help': ''
#                           
#            },
#             {
#                'name':'pos_x_percent',
#                'type': 'string',
#                'description': 'pos_x_percent',
#                'default': 0,
#                'help': ''
#                           
#            },
#            
#             {
#                'name': 'pos_y_percent',
#                'type': 'string',
#                'description': 'pos_y_percent',
#                'default': 0,
#                'help': ''
#                           
#            }
        ]
             
         
                
         
        } 

def run(*args, **kw_args):
    deferred = defer.Deferred()
    adapter = Adapter(deferred)
    reactor.callLater(0, adapter.execute, *args, **kw_args)
    return deferred

class Adapter:
    def __init__(self, deferred):    
        self.deferred = deferred
    
    def handle_result(self, result, component):
        log.debug('handle_result %s' % str(result))
        log.debug("[save_component] component %s" % component.pk)        
        
        if result:
            directory, name = os.path.split(result)
            
            component.uri = name
            component.save()
        else:
            log.error('Empty result passed to save_and_extract_features')
        self.deferred.callback(result)
        
    def handle_error(self, result):
        self.deferred.errback('error %s' % str(result))
    
    def execute(self,
                item_id, 
                workspace, 
                source_variant,
                output_variant,
                output_format,
                actions,
                resize_h = None,
                resize_w = None,
                crop_w = None,
                crop_h = None,
                crop_x = None,
                crop_y = None,
                crop_ratio = None,
                pos_x_percent = None,
                pos_y_percent = None,
                wm_id = None):

        log.info('executing adaptation')
        item = Item.objects.get(pk = item_id)
        source = Component.objects.get(workspace=workspace, variant__name=source_variant, item=item)
        
        output_variant = Variant.objects.get(name = output_variant)
        output_component = item.create_variant(output_variant, workspace)
                
        log.debug("[adapt_resource] from original component %s" % output_component.source)
        
        output_component.source = source
        argv = [] #for calling imagemagick
    
        for action in actions:
            if action == 'resize':
                argv +=  ['-resize', '%dx%d' % (resize_w, resize_h)]
                
            elif action == 'crop':
                if crop_ratio:
                    x, y = crop_ratio.split(':')
                    argv += ['-gravity', 'center', '-crop', '%dx%d%%+0+0' % (int(100./float(x)), int(100./float(y)))]
                else:
                    crop_x = crop_x or 0   # here None means 0
                    crop_y = crop_y or 0
                    argv += ['-crop', '%sx%s+%s+%s' % (int(crop_w), int(crop_h), int(crop_x), int(crop_y))]

            elif action == 'watermark':
                pos_x = int(pos_x_percent * source.width/100.)
                pos_y = int(pos_y_percent * source.height/100.)
                argv += ['cache://' + wm_id, '-geometry', '+%s+%s' % (pos_x,pos_y), '-composite']
        
        adapter_proxy = Proxy('Adapter')
        log.debug("calling adapter")
        dest_res_id = get_storage_file_name(item.ID, workspace.pk, output_variant.name, output_format)
        output_component.uri = dest_res_id
        output_component.save() 
        
        d = adapter_proxy.adapt_image_magick('%s[0]' % source.uri, dest_res_id, argv)
        d.addCallbacks(self.handle_result, self.handle_error, callbackArgs=[output_component])
        return self.deferred
    

def test():
    print 'test'
    item = Item.objects.get(pk=1)
    workspace = DAMWorkspace.objects.get(pk = 1)
    
    d = run(item.pk,
            workspace,
            source_variant = 'original',
            output_variant='fullscreen',
            output_format = 'jpg',
            actions = ['crop', 'resize'],
            resize_h=100,
            resize_w=100,
            crop_ratio="2:2",
            )
    d.addBoth(print_result)
    
def print_result(result):
    print 'print_result', result
    reactor.stop()

if __name__ == "__main__":
    from twisted.internet import reactor
    
    reactor.callWhenRunning(test)
    reactor.run()

    
    
    
