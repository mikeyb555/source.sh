﻿CKEDITOR.plugins.add("mergetags",{requires:["richcombo"],init:function(a){CKEDITOR.mergeTags.addExternal("merges",a.config.mergeTags);a.ui.addRichCombo("Merges",{label:"Merge Tags",title:"Merge Tags",voiceLabel:"Merge Tags",className:"cke_format",multiSelect:!1,panel:{css:[CKEDITOR.skin.getPath("editor")].concat(a.config.contentsCss)},init:function(){var a=this;CKEDITOR.mergeTags.load("merges",function(d){d=d.merges;a.add("cheatsheet","Open Cheatsheet","Open Cheatsheet");for(var b in d)if(b&&!("name"==
b||"path"==b)){a.startGroup(b);var f=d[b],c;for(c in f)c&&a.add(f[c],c,c)}a._.list.commit()})},onClick:function(e){"cheatsheet"==e?window.open("http://kb.mailchimp.com/article/all-the-merge-tags-cheatsheet","_blank"):(a.focus(),a.fire("saveSnapshot"),a.insertHtml(e),a.fire("saveSnapshot"));this._.value=""}})}});CKEDITOR.mergeTags=new CKEDITOR.resourceManager("","mergeTags");