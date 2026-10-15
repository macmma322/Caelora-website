FROM mcr.microsoft.com/dotnet/sdk:10.0.401 AS build
WORKDIR /source
COPY global.json NuGet.Config Directory.Build.props ./
COPY services/platform-api/ services/platform-api/
RUN dotnet restore services/platform-api/Caelora.Platform.Api.csproj --locked-mode
RUN dotnet publish services/platform-api/Caelora.Platform.Api.csproj -c Release --no-restore -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0.13 AS final
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Caelora.Platform.Api.dll"]
