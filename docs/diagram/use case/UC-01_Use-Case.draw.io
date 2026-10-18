<?xml version='1.0' encoding='utf-8'?>
<mxfile host="app.diagrams.net" version="26.0.0">
  <diagram id="UC-01 Thanh toán trực tuyến" name="UC-01 Thanh toán trực tuyến">
    <mxGraphModel grid="1" gridSize="10" page="1" pageScale="1" pageWidth="1330" pageHeight="550">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="boundary" value="HỆ THỐNG THUYẾT MINH ĐA NGÔN NGỮ&lt;br&gt;CHO CHÙA LINH ỨNG" style="html=1;whiteSpace=wrap;fontFamily=Arial;fontSize=20;fontColor=#111827;strokeColor=#374151;fillColor=#FFFFFF;strokeWidth=1.5;rounded=0;verticalAlign=top;spacingTop=22;fontStyle=1;fillColor=none;" vertex="1" parent="1">
          <mxGeometry x="270" y="35" width="790" height="470" as="geometry" />
        </mxCell>
        <mxCell id="guest" value="Khách tham quan" style="html=1;whiteSpace=wrap;fontFamily=Arial;fontSize=18;fontColor=#111827;strokeColor=#374151;fillColor=#FFFFFF;strokeWidth=1.5;shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;" vertex="1" parent="1">
          <mxGeometry x="55" y="220" width="65" height="90" as="geometry" />
        </mxCell>
        <mxCell id="uc01" value="UC-01&lt;br&gt;Thanh toán trực tuyến" style="html=1;whiteSpace=wrap;fontFamily=Arial;fontSize=23;fontColor=#111827;strokeColor=#374151;fillColor=#FFFFFF;strokeWidth=1.5;ellipse;" vertex="1" parent="1">
          <mxGeometry x="465" y="225" width="380" height="110" as="geometry" />
        </mxCell>
        <mxCell id="gateway" value="Cổng thanh toán" style="html=1;whiteSpace=wrap;fontFamily=Arial;fontSize=18;fontColor=#111827;strokeColor=#374151;fillColor=#FFFFFF;strokeWidth=1.5;shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;" vertex="1" parent="1">
          <mxGeometry x="1175" y="220" width="65" height="90" as="geometry" />
        </mxCell>
        <mxCell id="guest-payment" style="html=1;rounded=0;endArrow=none;endFill=1;strokeColor=#4B5563;strokeWidth=1.5;fontFamily=Arial;fontSize=17;exitX=1.0;exitY=0.4444444444444444;exitPerimeter=0;entryX=0.004117969220213748;entryY=0.4359608592365951;entryPerimeter=0;" edge="1" parent="1" source="guest" target="uc01">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="gateway-payment" style="html=1;rounded=0;endArrow=none;endFill=1;strokeColor=#4B5563;strokeWidth=1.5;fontFamily=Arial;fontSize=17;exitX=0.0;exitY=0.4444444444444444;exitPerimeter=0;entryX=0.9956441694601542;entryY=0.4341451802815181;entryPerimeter=0;" edge="1" parent="1" source="gateway" target="uc01">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>